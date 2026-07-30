import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createTaskWorklogSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'
import { z } from 'zod'

/**
 * Public API worklog create — same fields as internal API, plus optional authorId
 * (API keys have no session user; callers may attribute time to a specific user).
 */
const publicCreateWorklogSchema = createTaskWorklogSchema.extend({
  authorId: z.string().min(1).optional(),
})

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

/**
 * Resolve author for API-key writes: explicit authorId (must belong to org),
 * else first admin/manager, else any user in the org.
 */
async function resolveAuthorId(orgId: string, preferred?: string | null) {
  if (preferred) {
    const user = await db.user.findFirst({
      where: { id: preferred, orgId },
      select: { id: true },
    })
    if (!user) return null
    return user.id
  }
  const preferredRole = await db.user.findFirst({
    where: { orgId, role: { in: ['admin', 'manager'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (preferredRole) return preferredRole.id
  const any = await db.user.findFirst({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return any?.id ?? null
}

// GET /api/v1/worklogs?taskId= — list worklogs for a task (read scope)
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) {
    return apiError('taskId query parameter is required', 'validation_error', 400)
  }

  const task = await db.task.findFirst({
    where: { id: taskId, orgId: g.ctx!.orgId },
    select: { id: true, spentHours: true, title: true },
  })
  if (!task) {
    return apiError('Task not found in your org', 'not_found', 404)
  }

  const limit = Math.min(100, Number(searchParams.get('limit') || '50'))

  const worklogs = await db.taskWorklog.findMany({
    where: { orgId: g.ctx!.orgId, taskId },
    select: {
      id: true,
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

  return apiOk({
    task: { id: task.id, title: task.title, spentHours: task.spentHours },
    worklogs,
  })
}

// POST /api/v1/worklogs — log time against a task (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, publicCreateWorklogSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const task = await db.task.findFirst({
    where: { id: data.taskId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!task) {
    return apiError('Task not found in your org', 'not_found', 404)
  }

  const authorId = await resolveAuthorId(g.ctx!.orgId, data.authorId)
  if (!authorId) {
    return apiError(
      data.authorId
        ? 'authorId does not belong to this organization'
        : 'No users in organization to attribute worklog to',
      'validation_error',
      400
    )
  }

  const worklog = await db.taskWorklog.create({
    data: {
      orgId: g.ctx!.orgId,
      taskId: data.taskId,
      authorId,
      hours: data.hours,
      note: data.note ?? null,
      ...(data.loggedAt ? { loggedAt: new Date(data.loggedAt) } : {}),
    },
    select: {
      id: true,
      hours: true,
      note: true,
      loggedAt: true,
      createdAt: true,
      author: { select: { id: true, name: true, email: true } },
      task: { select: { id: true, title: true } },
    },
  })

  const spentHours = await recalcSpentHours(g.ctx!.orgId, data.taskId)

  await emitEvent(g.ctx!.orgId, 'task.worklog.created', {
    worklog: {
      id: worklog.id,
      taskId: data.taskId,
      hours: worklog.hours,
      authorId,
    },
  })

  return apiOk({ worklog, spentHours }, 201)
}
