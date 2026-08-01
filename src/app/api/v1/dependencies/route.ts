import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createPublicTaskDependencySchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Task dependencies (Module 1 Tasks).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('tasks').
 * Foundation for Gantt / dependency-aware tooling.
 */

// GET /api/v1/dependencies?taskId=&limit=
// Optional taskId filters to deps where the task is from or to.
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  if (taskId) {
    const task = await db.task.findFirst({
      where: { id: taskId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!task) {
      return apiError('Task not found in your org', 'not_found', 404)
    }
  }

  const dependencies = await db.taskDependency.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(taskId
        ? { OR: [{ fromTaskId: taskId }, { toTaskId: taskId }] }
        : {}),
    },
    select: {
      id: true,
      fromTaskId: true,
      toTaskId: true,
      type: true,
      createdAt: true,
      fromTask: { select: { id: true, title: true, status: true } },
      toTask: { select: { id: true, title: true, status: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  return apiOk({ dependencies })
}

// POST /api/v1/dependencies — create a dependency (write scope)
// Body: { fromTaskId, toTaskId, type? }  type defaults to 'blocks'
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createPublicTaskDependencySchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const fromTask = await db.task.findFirst({
    where: { id: data.fromTaskId, orgId: g.ctx!.orgId },
    select: { id: true, title: true },
  })
  const toTask = await db.task.findFirst({
    where: { id: data.toTaskId, orgId: g.ctx!.orgId },
    select: { id: true, title: true },
  })
  if (!fromTask || !toTask) {
    return apiError('One or both tasks not found in your org', 'not_found', 404)
  }

  const existing = await db.taskDependency.findFirst({
    where: {
      orgId: g.ctx!.orgId,
      fromTaskId: data.fromTaskId,
      toTaskId: data.toTaskId,
      type: data.type,
    },
  })
  if (existing) {
    return apiError('Dependency already exists', 'conflict', 409)
  }

  const dependency = await db.taskDependency.create({
    data: {
      orgId: g.ctx!.orgId,
      fromTaskId: data.fromTaskId,
      toTaskId: data.toTaskId,
      type: data.type,
    },
    select: {
      id: true,
      fromTaskId: true,
      toTaskId: true,
      type: true,
      createdAt: true,
      fromTask: { select: { id: true, title: true, status: true } },
      toTask: { select: { id: true, title: true, status: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'task.dependency.created', {
    dependency: {
      id: dependency.id,
      fromTaskId: dependency.fromTaskId,
      toTaskId: dependency.toTaskId,
      type: dependency.type,
      fromTask: dependency.fromTask,
      toTask: dependency.toTask,
    },
  })

  return apiOk({ dependency }, 201)
}
