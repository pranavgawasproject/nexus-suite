import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createPublicTaskCommentSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Task comments (Module 1 Tasks).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('tasks').
 */

// GET /api/v1/comments?taskId=&limit=
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

  const comments = await db.taskComment.findMany({
    where: {
      orgId: g.ctx!.orgId,
      taskId,
    },
    select: {
      id: true,
      taskId: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  return apiOk({ comments })
}

// POST /api/v1/comments — create comment (write scope)
// Body: { taskId, authorId, body }
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createPublicTaskCommentSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const task = await db.task.findFirst({
    where: { id: data.taskId, orgId: g.ctx!.orgId },
    select: { id: true, title: true },
  })
  if (!task) {
    return apiError('Task not found in your org', 'not_found', 404)
  }

  const author = await db.user.findFirst({
    where: { id: data.authorId, orgId: g.ctx!.orgId },
    select: { id: true, name: true, email: true, avatarUrl: true },
  })
  if (!author) {
    return apiError('Author user not found in your org', 'not_found', 404)
  }

  const comment = await db.taskComment.create({
    data: {
      orgId: g.ctx!.orgId,
      taskId: data.taskId,
      authorId: data.authorId,
      body: data.body,
    },
    select: {
      id: true,
      taskId: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'task.comment.created', {
    comment: {
      id: comment.id,
      taskId: comment.taskId,
      body: comment.body,
      author: comment.author,
    },
  })

  return apiOk({ comment }, 201)
}
