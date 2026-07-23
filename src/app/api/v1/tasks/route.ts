import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createTaskSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

// GET /api/v1/tasks — list tasks.
// Optional: ?projectId=, ?status=, ?assigneeId=, ?limit= (max 100)
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const assigneeId = searchParams.get('assigneeId')
  const limit = Math.min(100, Number(searchParams.get('limit') || '50'))

  const tasks = await db.task.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(projectId ? { projectId } : {}),
      ...(status ? { status } : {}),
      ...(assigneeId ? { assigneeId } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      type: true,
      dueDate: true,
      estimateHours: true,
      spentHours: true,
      tags: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: { position: 'asc' },
    take: limit,
  })

  return apiOk({ tasks })
}

// POST /api/v1/tasks — create a task.
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createTaskSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  // Verify the project belongs to this org
  const project = await db.project.findFirst({
    where: { id: data.projectId, orgId: g.ctx!.orgId },
  })
  if (!project) {
    return apiError('Project not found in your org', 'not_found', 404)
  }

  const maxPos = await db.task.aggregate({
    where: { projectId: data.projectId, status: data.status },
    _max: { position: true },
  })

  const task = await db.task.create({
    data: {
      orgId: g.ctx!.orgId,
      projectId: data.projectId,
      title: data.title,
      description: data.description || null,
      status: data.status,
      priority: data.priority,
      type: data.type,
      assigneeId: data.assigneeId || null,
      reporterId: data.reporterId || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      estimateHours: data.estimateHours ?? null,
      tags: data.tags || null,
      position: (maxPos._max.position ?? -1) + 1,
    },
    select: {
      id: true, title: true, status: true, priority: true, type: true,
      dueDate: true, createdAt: true,
      project: { select: { id: true, name: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'task.created', { task })

  return apiOk({ task }, 201)
}
