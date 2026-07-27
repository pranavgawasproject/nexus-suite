import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { z } from 'zod'
import { rowsToCsv, TASK_CSV_EXPORT_COLUMNS } from '@/lib/csv'

/**
 * CSV export for Tasks (Module 1) — round-trip friendly with POST /api/import/tasks.
 * Query: projectId? (optional — omit for all org tasks), format defaults to csv.
 */
const querySchema = z.object({
  projectId: z.string().min(1).optional(),
})

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, querySchema)
    if (error) return error

    const orgId = g.ctx!.org.id
    const userId = g.ctx!.user!.id

    if (data.projectId) {
      const project = await db.project.findFirst({
        where: { id: data.projectId, orgId },
      })
      if (!project) {
        return NextResponse.json(
          { error: 'project_not_found', message: 'Project does not exist or is not in this organization' },
          { status: 404 }
        )
      }
    }

    const tasks = await db.task.findMany({
      where: {
        orgId,
        ...(data.projectId ? { projectId: data.projectId } : {}),
      },
      orderBy: [{ projectId: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
    })

    const header = [...TASK_CSV_EXPORT_COLUMNS]
    const body = tasks.map((t) => [
      t.title,
      t.description ?? '',
      t.status,
      t.priority,
      t.type,
      t.dueDate ? t.dueDate.toISOString() : '',
      t.estimateHours != null ? String(t.estimateHours) : '',
      t.tags ?? '',
    ])

    const csv = rowsToCsv([header, ...body])

    await audit(orgId, userId, 'tasks.csv_exported', 'Task', null, {
      projectId: data.projectId ?? null,
      rowCount: tasks.length,
    })

    const filename = data.projectId
      ? `nexus-tasks-${data.projectId}-${Date.now()}.csv`
      : `nexus-tasks-org-${Date.now()}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}
