import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { z } from 'zod'
import { taskStatusEnum, taskPriorityEnum, taskTypeEnum } from '@/lib/schemas'

/**
 * CSV import for Tasks (Module 1).
 * Body: { projectId: string, csv: string }
 * CSV headers (case-insensitive): title (required), description, status,
 * priority, type, dueDate (ISO), estimateHours, tags
 * Returns { created, skipped, errors[] }
 */
const importTasksSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  csv: z.string().min(1, 'csv content is required').max(2_000_000),
})

const rowSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  status: taskStatusEnum.optional().default('todo'),
  priority: taskPriorityEnum.optional().default('medium'),
  type: taskTypeEnum.optional().default('task'),
  dueDate: z.string().datetime().optional().nullable(),
  estimateHours: z.coerce.number().min(0).optional().nullable(),
  tags: z.string().max(500).optional().nullable(),
})

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      current.push(field.trim())
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      current.push(field.trim())
      field = ''
      if (current.some((cell) => cell.length > 0)) rows.push(current)
      current = []
    } else {
      field += c
    }
  }
  current.push(field.trim())
  if (current.some((cell) => cell.length > 0)) rows.push(current)
  return rows
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

const HEADER_MAP: Record<string, string> = {
  title: 'title',
  name: 'title',
  task: 'title',
  tasktitle: 'title',
  description: 'description',
  desc: 'description',
  status: 'status',
  state: 'status',
  priority: 'priority',
  type: 'type',
  duedate: 'dueDate',
  due: 'dueDate',
  deadline: 'dueDate',
  estimatehours: 'estimateHours',
  estimate: 'estimateHours',
  hours: 'estimateHours',
  tags: 'tags',
  label: 'tags',
  labels: 'tags',
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, importTasksSchema)
    if (error) return error

    const orgId = g.ctx!.org.id
    const userId = g.ctx!.user!.id

    const project = await db.project.findFirst({
      where: { id: data.projectId, orgId },
    })
    if (!project) {
      return NextResponse.json(
        { error: 'project_not_found', message: 'Project does not exist or is not in this organization' },
        { status: 404 }
      )
    }

    const rows = parseCsv(data.csv)
    if (rows.length < 2) {
      return NextResponse.json(
        { error: 'invalid_csv', message: 'CSV must have a header row and at least one data row' },
        { status: 400 }
      )
    }

    const headers = rows[0].map(normalizeHeader)
    const mappedKeys = headers.map((h) => HEADER_MAP[h] || null)
    if (!mappedKeys.includes('title')) {
      return NextResponse.json(
        {
          error: 'missing_title_column',
          message: 'CSV must include a title (or name/task) column',
          headers: rows[0],
        },
        { status: 400 }
      )
    }

    const maxPos = await db.task.aggregate({
      where: { projectId: data.projectId, status: 'todo' },
      _max: { position: true },
    })
    let nextPos = (maxPos._max.position ?? -1) + 1

    let created = 0
    let skipped = 0
    const errors: Array<{ row: number; message: string }> = []
    const createdIds: string[] = []

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i]
      const raw: Record<string, string> = {}
      for (let j = 0; j < mappedKeys.length; j++) {
        const key = mappedKeys[j]
        if (key && cells[j] !== undefined && cells[j] !== '') {
          raw[key] = cells[j]
        }
      }

      if (!raw.title) {
        skipped++
        errors.push({ row: i + 1, message: 'missing title' })
        continue
      }

      // Coerce empty optional fields
      const parsed = rowSchema.safeParse({
        title: raw.title,
        description: raw.description || null,
        status: raw.status || undefined,
        priority: raw.priority || undefined,
        type: raw.type || undefined,
        dueDate: raw.dueDate || null,
        estimateHours: raw.estimateHours !== undefined ? raw.estimateHours : null,
        tags: raw.tags || null,
      })

      if (!parsed.success) {
        skipped++
        errors.push({
          row: i + 1,
          message: parsed.error.issues.map((iss) => `${iss.path.join('.')}: ${iss.message}`).join('; '),
        })
        continue
      }

      const row = parsed.data
      try {
        const task = await db.task.create({
          data: {
            orgId,
            projectId: data.projectId,
            title: row.title,
            description: row.description || null,
            status: row.status,
            priority: row.priority,
            type: row.type,
            reporterId: userId,
            dueDate: row.dueDate ? new Date(row.dueDate) : null,
            estimateHours: row.estimateHours ?? null,
            tags: row.tags || null,
            position: nextPos++,
          },
        })
        createdIds.push(task.id)
        created++
      } catch (err) {
        skipped++
        errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : 'create failed',
        })
      }
    }

    await audit(orgId, userId, 'tasks.csv_imported', 'Task', null, {
      projectId: data.projectId,
      created,
      skipped,
      errorCount: errors.length,
    })

    return NextResponse.json({
      created,
      skipped,
      errors: errors.slice(0, 50),
      createdIds: createdIds.slice(0, 100),
    })
  })
}
