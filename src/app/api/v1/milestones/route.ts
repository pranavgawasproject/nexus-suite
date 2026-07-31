import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createMilestoneSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Project Milestones (Module 1 Tasks).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('tasks').
 */

// GET /api/v1/milestones?projectId=&status=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const milestones = await db.milestone.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      status: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  })

  return apiOk({
    milestones: milestones.map((m) => ({
      id: m.id,
      projectId: m.projectId,
      name: m.name,
      description: m.description,
      status: m.status,
      dueDate: m.dueDate,
      taskCount: m._count.tasks,
      project: m.project,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    })),
  })
}

// POST /api/v1/milestones — create milestone (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createMilestoneSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const project = await db.project.findFirst({
    where: { id: data.projectId, orgId: g.ctx!.orgId },
    select: { id: true, name: true },
  })
  if (!project) {
    return apiError('projectId does not belong to this organization', 'not_found', 404)
  }

  const milestone = await db.milestone.create({
    data: {
      orgId: g.ctx!.orgId,
      projectId: data.projectId,
      name: data.name,
      description: data.description || null,
      status: data.status ?? 'planned',
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      status: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await emitEvent(g.ctx!.orgId, 'milestone.created', {
    milestone: {
      id: milestone.id,
      projectId: milestone.projectId,
      name: milestone.name,
      status: milestone.status,
      dueDate: milestone.dueDate,
    },
  })

  return apiOk({ milestone }, 201)
}
