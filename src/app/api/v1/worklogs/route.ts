import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createPublicTaskWorklogSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

async function recalcSpentHours(orgId: string, taskId: string) {
  const agg = await db.taskWorklog.aggregate({
    where: { orgId, taskId },
    _sum: { hours: true },
  })
  const spent = agg._sum.hours ?? 0
  await db.task.update({
    where: { id: taskId },
    data: { spentHours: spent },
  })
  return spent
}

// GET /api/v1/worklogs — list worklogs for a task.
// Required: ?taskId=
// Optional: ?authorId=, ?limit= (max 100)
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) {
    return apiError('taskId query parameter is required', 'validation_error', 400)
  }
  const authorId = searchParams.get('authorId')
  const limit = Math.min(100, Number(searchParams.get('limit') || '50'))

  const task = await db.task.findFirst({
    where: { id: taskId, orgId: g.ctx!.orgId },
    select: { id: true, spentHours: true },
  })
  if (!task) {
    return apiError('Task not found in your org', 'not_found', 404)
  }

  const worklogs = await db.taskWorklog.findMany({
    where: {
      orgId: g.ctx!.orgId,
      taskId,
      ...(authorId ? { authorId } : {}),
    },
    select: {
      id: true,
      taskId: true,
      hours: true,
      note: true,
      loggedAt: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ loggedAt: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })

  return apiOk({ worklogs, spentHours: task.spentHours })
}

// POST /api/v1/worklogs — create a worklog (time entry).
// Body: { taskId, authorId, hours, note?, loggedAt? }
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createPublicTaskWorklogSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const task = await db.task.findFirst({
    where: { id: data.taskId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!task) {
    return apiError('Task not found in your org', 'not_found', 404)
  }

  const author = await db.user.findFirst({
    where: { id: data.authorId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!author) {
    return apiError('Author user not found in your org', 'not_found', 404)
  }

  const worklog = await db.taskWorklog.create({
    data: {
      orgId: g.ctx!.orgId,
      taskId: data.taskId,
      authorId: data.authorId,
      hours: data.hours,
      note: data.note ?? null,
      ...(data.loggedAt ? { loggedAt: new Date(data.loggedAt) } : {}),
    },
    select: {
      id: true,
      taskId: true,
      hours: true,
      note: true,
      loggedAt: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
    },
  })

  const spentHours = await recalcSpentHours(g.ctx!.orgId, data.taskId)

  await emitEvent(g.ctx!.orgId, 'task.worklog.created', { worklog, spentHours })

  return apiOk({ worklog, spentHours }, 201)
}
