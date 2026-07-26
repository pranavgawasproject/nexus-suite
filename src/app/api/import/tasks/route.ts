import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { importTasksSchema, taskStatusEnum, taskPriorityEnum, taskTypeEnum } from '@/lib/schemas'

/** Simple RFC4180-ish CSV line splitter (handles quoted fields with commas). */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur.trim())
  return out
}

function parseCsv(csv: string): Record<string, string>[] {
  const lines = csv
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'))
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? ''
    })
    rows.push(row)
  }
  return rows
}

/** Map common CSV header aliases → task fields. */
const ALIASES: Record<string, string> = {
  title: 'title',
  name: 'title',
  summary: 'title',
  task: 'title',
  subject: 'title',
  description: 'description',
  desc: 'description',
  body: 'description',
  details: 'description',
  status: 'status',
  state: 'status',
  priority: 'priority',
  type: 'type',
  kind: 'type',
  tags: 'tags',
  labels: 'tags',
  label: 'tags',
  due: 'dueDate',
  due_date: 'dueDate',
  duedate: 'dueDate',
  deadline: 'dueDate',
  estimate: 'estimateHours',
  estimate_hours: 'estimateHours',
  estimatehours: 'estimateHours',
  hours: 'estimateHours',
  story_points: 'estimateHours',
}

function mapRow(raw: Record<string, string>) {
  const mapped: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(raw)) {
    const field = ALIASES[key] || ALIASES[key.replace(/-/g, '_')]
    if (!field || val === undefined || val === '') continue
    mapped[field] = val
  }
  return mapped
}

function coerceStatus(v: unknown): string {
  const s = String(v ?? 'todo').toLowerCase().replace(/\s+/g, '_')
  const aliases: Record<string, string> = {
    todo: 'todo',
    'to_do': 'todo',
    open: 'todo',
    backlog: 'todo',
    in_progress: 'in_progress',
    'in-progress': 'in_progress',
    doing: 'in_progress',
    wip: 'in_progress',
    in_review: 'in_review',
    review: 'in_review',
    done: 'done',
    closed: 'done',
    complete: 'done',
    completed: 'done',
    blocked: 'blocked',
  }
  return aliases[s] || (taskStatusEnum.safeParse(s).success ? s : 'todo')
}

function coercePriority(v: unknown): string {
  const s = String(v ?? 'medium').toLowerCase()
  const aliases: Record<string, string> = {
    low: 'low',
    medium: 'medium',
    med: 'medium',
    normal: 'medium',
    high: 'high',
    urgent: 'urgent',
    critical: 'urgent',
    p0: 'urgent',
    p1: 'high',
    p2: 'medium',
    p3: 'low',
  }
  return aliases[s] || (taskPriorityEnum.safeParse(s).success ? s : 'medium')
}

function coerceType(v: unknown): string {
  const s = String(v ?? 'task').toLowerCase()
  const aliases: Record<string, string> = {
    task: 'task',
    feature: 'feature',
    story: 'feature',
    bug: 'bug',
    defect: 'bug',
    epic: 'epic',
  }
  return aliases[s] || (taskTypeEnum.safeParse(s).success ? s : 'task')
}

function parseDueDate(v: unknown): Date | null {
  if (!v) return null
  const s = String(v).trim()
  if (!s) return null
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T00:00:00.000Z')
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

/**
 * POST /api/import/tasks
 * CSV / JSON bulk import for Tasks module (PRD §5 Data Portability).
 * Accepts either pre-mapped `rows` or raw `csv` with header auto-mapping.
 * Max 500 rows per request. Creates tasks under the given projectId.
 */
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, importTasksSchema)
    if (error) return error

    // Verify project belongs to this org
    const project = await db.project.findFirst({
      where: { id: data.projectId, orgId: g.ctx!.org.id },
    })
    if (!project) {
      return NextResponse.json(
        { error: 'project_not_found', message: 'Project not found in this organization' },
        { status: 404 }
      )
    }

    let rawRows: Record<string, unknown>[] = []
    if (data.rows && data.rows.length > 0) {
      rawRows = data.rows as unknown as Record<string, unknown>[]
    } else if (data.csv) {
      const parsed = parseCsv(data.csv)
      rawRows = parsed.map(mapRow)
    }

    if (rawRows.length === 0) {
      return NextResponse.json({ error: 'no_rows', message: 'No importable rows found' }, { status: 400 })
    }
    if (rawRows.length > 500) {
      return NextResponse.json(
        { error: 'too_many_rows', message: 'Maximum 500 rows per import' },
        { status: 400 }
      )
    }

    const maxPos = await db.task.aggregate({
      where: { projectId: data.projectId },
      _max: { position: true },
    })
    let nextPos = (maxPos._max.position ?? -1) + 1

    const created: { id: string; title: string }[] = []
    const skipped: { row: number; reason: string }[] = []

    for (let i = 0; i < rawRows.length; i++) {
      const raw = rawRows[i]
      const title = String(raw.title ?? '').trim()
      if (!title) {
        skipped.push({ row: i + 1, reason: 'missing title' })
        continue
      }

      const status = coerceStatus(raw.status)
      const priority = coercePriority(raw.priority)
      const type = coerceType(raw.type)
      const description =
        raw.description !== undefined && raw.description !== null
          ? String(raw.description).slice(0, 5000)
          : null
      const tags =
        raw.tags !== undefined && raw.tags !== null ? String(raw.tags).slice(0, 500) : null
      const dueDate = parseDueDate(raw.dueDate)
      let estimateHours: number | null = null
      if (raw.estimateHours !== undefined && raw.estimateHours !== null && raw.estimateHours !== '') {
        const n = Number(raw.estimateHours)
        if (!isNaN(n) && n >= 0) estimateHours = n
      }

      try {
        const task = await db.task.create({
          data: {
            orgId: g.ctx!.org.id,
            projectId: data.projectId,
            title: title.slice(0, 200),
            description,
            status,
            priority,
            type,
            tags,
            dueDate,
            estimateHours,
            reporterId: g.ctx!.user!.id,
            position: nextPos++,
          },
          select: { id: true, title: true },
        })
        created.push(task)
      } catch (e) {
        skipped.push({
          row: i + 1,
          reason: e instanceof Error ? e.message : 'create_failed',
        })
      }
    }

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'tasks.imported', 'Project', data.projectId, {
      created: created.length,
      skipped: skipped.length,
    })

    return NextResponse.json({
      ok: true,
      created: created.length,
      skipped: skipped.length,
      tasks: created,
      errors: skipped,
    })
  })
}
