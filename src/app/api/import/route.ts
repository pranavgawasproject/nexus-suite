import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, audit, withErrors } from '@/lib/api-guard'
import { z } from 'zod'

/**
 * CSV Import API — PRD §5 Data Portability
 * POST /api/import
 * Body: { module: 'tasks', csv: string, dryRun?: boolean, projectId?: string }
 *
 * Supported columns for tasks (header row required, case-insensitive):
 *   title* | projectName | projectId | status | priority | type |
 *   description | dueDate | tags | assigneeEmail
 *
 * *title is required. projectId or projectName required unless body.projectId is set.
 * dryRun=true returns parsed rows + validation errors without writing.
 */

const importBodySchema = z.object({
  module: z.enum(['tasks']),
  csv: z.string().min(1, 'csv content is required'),
  dryRun: z.boolean().optional().default(false),
  projectId: z.string().optional().nullable(),
})

const VALID_STATUS = new Set(['todo', 'in_progress', 'in_review', 'done', 'blocked'])
const VALID_PRIORITY = new Set(['low', 'medium', 'high', 'urgent'])
const VALID_TYPE = new Set(['task', 'feature', 'bug', 'epic'])

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && text[i + 1] === '\n') i++
      if (current.trim().length > 0 || lines.length > 0) lines.push(current)
      current = ''
    } else {
      current += c
    }
  }
  if (current.trim().length > 0) lines.push(current)

  if (lines.length === 0) return { headers: [], rows: [] }

  const splitLine = (line: string): string[] => {
    const cells: string[] = []
    let cell = ''
    let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (q && line[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          q = !q
        }
      } else if (ch === ',' && !q) {
        cells.push(cell.trim())
        cell = ''
      } else {
        cell += ch
      }
    }
    cells.push(cell.trim())
    return cells
  }

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''))
  const rows = lines.slice(1).map(splitLine).filter((r) => r.some((c) => c.length > 0))
  return { headers, rows }
}

function cell(headers: string[], row: string[], name: string): string {
  const idx = headers.indexOf(name.toLowerCase().replace(/\s+/g, ''))
  if (idx < 0 || idx >= row.length) return ''
  return row[idx] ?? ''
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    let body: z.infer<typeof importBodySchema>
    try {
      const json = await req.json()
      body = importBodySchema.parse(json)
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'validation_error',
            details: err.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    // Only tasks supported in this first ship; gate on tasks module
    const g = await requireModule('tasks')
    if (g.response) return g.response
    const orgId = g.ctx!.org.id
    const actorId = g.ctx!.user?.id

    const { headers, rows } = parseCsv(body.csv)
    if (headers.length === 0) {
      return NextResponse.json({ error: 'empty_csv', message: 'CSV has no header row' }, { status: 400 })
    }
    if (!headers.includes('title')) {
      return NextResponse.json(
        {
          error: 'missing_column',
          message: 'CSV must include a "title" column',
          headers,
        },
        { status: 400 }
      )
    }

    // Preload projects and users for name/email resolution
    const projects = await db.project.findMany({
      where: { orgId },
      select: { id: true, name: true },
    })
    const projectByName = new Map(projects.map((p) => [p.name.toLowerCase(), p.id]))
    const projectById = new Set(projects.map((p) => p.id))

    const users = await db.user.findMany({
      where: { orgId },
      select: { id: true, email: true },
    })
    const userByEmail = new Map(users.map((u) => [u.email.toLowerCase(), u.id]))

    type ParsedRow = {
      row: number
      title: string
      projectId: string | null
      status: string
      priority: string
      type: string
      description: string | null
      dueDate: string | null
      tags: string | null
      assigneeId: string | null
      errors: string[]
    }

    const parsed: ParsedRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const errors: string[] = []
      const title = cell(headers, r, 'title')
      if (!title) errors.push('title is required')

      let projectId = cell(headers, r, 'projectId') || body.projectId || ''
      const projectName = cell(headers, r, 'projectName')
      if (!projectId && projectName) {
        projectId = projectByName.get(projectName.toLowerCase()) || ''
        if (!projectId) errors.push(`unknown projectName: "${projectName}"`)
      }
      if (!projectId) {
        errors.push('projectId or projectName is required (or pass body.projectId)')
      } else if (!projectById.has(projectId)) {
        errors.push(`projectId not found in this org: ${projectId}`)
      }

      let status = (cell(headers, r, 'status') || 'todo').toLowerCase().replace(/\s+/g, '_')
      if (!VALID_STATUS.has(status)) {
        errors.push(`invalid status: ${status}`)
        status = 'todo'
      }

      let priority = (cell(headers, r, 'priority') || 'medium').toLowerCase()
      if (!VALID_PRIORITY.has(priority)) {
        errors.push(`invalid priority: ${priority}`)
        priority = 'medium'
      }

      let type = (cell(headers, r, 'type') || 'task').toLowerCase()
      if (!VALID_TYPE.has(type)) {
        errors.push(`invalid type: ${type}`)
        type = 'task'
      }

      const description = cell(headers, r, 'description') || null
      const tags = cell(headers, r, 'tags') || null
      let dueDate: string | null = cell(headers, r, 'dueDate') || null
      if (dueDate) {
        const d = new Date(dueDate)
        if (Number.isNaN(d.getTime())) {
          errors.push(`invalid dueDate: ${dueDate}`)
          dueDate = null
        } else {
          dueDate = d.toISOString()
        }
      }

      let assigneeId: string | null = null
      const assigneeEmail = cell(headers, r, 'assigneeEmail')
      if (assigneeEmail) {
        assigneeId = userByEmail.get(assigneeEmail.toLowerCase()) || null
        if (!assigneeId) errors.push(`unknown assigneeEmail: ${assigneeEmail}`)
      }

      parsed.push({
        row: i + 2, // 1-based data row (header is 1)
        title,
        projectId: projectId || null,
        status,
        priority,
        type,
        description,
        dueDate,
        tags,
        assigneeId,
        errors,
      })
    }

    const validRows = parsed.filter((p) => p.errors.length === 0)
    const invalidRows = parsed.filter((p) => p.errors.length > 0)

    if (body.dryRun) {
      return NextResponse.json({
        dryRun: true,
        module: 'tasks',
        total: parsed.length,
        valid: validRows.length,
        invalid: invalidRows.length,
        rows: parsed,
      })
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        {
          error: 'no_valid_rows',
          message: 'No rows passed validation; nothing imported',
          total: parsed.length,
          invalid: invalidRows.length,
          rows: parsed,
        },
        { status: 400 }
      )
    }

    // Position offset per project+status so imports append at the end
    const posCache = new Map<string, number>()
    const getNextPos = async (projectId: string, status: string) => {
      const key = `${projectId}:${status}`
      if (!posCache.has(key)) {
        const maxPos = await db.task.aggregate({
          where: { projectId, status },
          _max: { position: true },
        })
        posCache.set(key, maxPos._max.position ?? -1)
      }
      const next = (posCache.get(key) as number) + 1
      posCache.set(key, next)
      return next
    }

    const created: { id: string; title: string; row: number }[] = []
    for (const row of validRows) {
      const position = await getNextPos(row.projectId!, row.status)
      const task = await db.task.create({
        data: {
          orgId,
          projectId: row.projectId!,
          title: row.title.slice(0, 200),
          description: row.description ? row.description.slice(0, 5000) : null,
          status: row.status,
          priority: row.priority,
          type: row.type,
          assigneeId: row.assigneeId,
          reporterId: actorId || null,
          dueDate: row.dueDate ? new Date(row.dueDate) : null,
          tags: row.tags ? row.tags.slice(0, 500) : null,
          position,
        },
      })
      created.push({ id: task.id, title: task.title, row: row.row })
    }

    await audit(orgId, actorId, 'tasks.csv_imported', 'Task', null, {
      count: created.length,
      skipped: invalidRows.length,
    })

    return NextResponse.json({
      dryRun: false,
      module: 'tasks',
      imported: created.length,
      skipped: invalidRows.length,
      created,
      invalidRows: invalidRows.map((r) => ({ row: r.row, title: r.title, errors: r.errors })),
    })
  })
}
