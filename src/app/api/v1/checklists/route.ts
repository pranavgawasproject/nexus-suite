import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createTaskChecklistItemSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Task checklists (Module 1 Tasks).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('tasks').
 */

// GET /api/v1/checklists?taskId=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const taskId = searchParams.get('taskId')
  if (!taskId) {
    return apiError('taskId query parameter is required', 'validation_error', 400)
  }
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const task = await db.task.findFirst({
    where: { id: taskId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!task) {
    return apiError('Task not found in your org', 'not_found', 404)
  }

  const items = await db.taskChecklistItem.findMany({
    where: {
      orgId: g.ctx!.orgId,
      taskId,
    },
    select: {
      id: true,
      taskId: true,
      title: true,
      completed: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  })

  return apiOk({ items })
}

// POST /api/v1/checklists — create checklist item (write scope)
// Body: { taskId, title, position? }
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createTaskChecklistItemSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const task = await db.task.findFirst({
    where: { id: data.taskId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!task) {
    return apiError('Task not found in your org', 'not_found', 404)
  }

  let position = data.position
  if (position === undefined) {
    const last = await db.taskChecklistItem.findFirst({
      where: { orgId: g.ctx!.orgId, taskId: data.taskId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    position = (last?.position ?? -1) + 1
  }

  const item = await db.taskChecklistItem.create({
    data: {
      orgId: g.ctx!.orgId,
      taskId: data.taskId,
      title: data.title,
      position,
    },
    select: {
      id: true,
      taskId: true,
      title: true,
      completed: true,
      position: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await emitEvent(g.ctx!.orgId, 'task.checklist.created', {
    item: {
      id: item.id,
      taskId: item.taskId,
      title: item.title,
      completed: item.completed,
      position: item.position,
    },
  })

  return apiOk({ item }, 201)
}
