import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createCycleSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API â Cycles / Sprints (Module 1 Tasks).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('tasks').
 */

// GET /api/v1/cycles?projectId=&status=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const cycles = await db.cycle.findMany({
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
      startDate: true,
      endDate: true,
      goal: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })

  return apiOk({
    cycles: cycles.map((c) => ({
      id: c.id,
      projectId: c.projectId,
      name: c.name,
      description: c.description,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      goal: c.goal,
      taskCount: c._count.tasks,
      project: c.project,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    })),
  })
}

// POST /api/v1/cycles â create cycle (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createCycleSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  if (data.projectId) {
    const project = await db.project.findFirst({
      where: { id: data.projectId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!project) {
      return apiError('projectId does not belong to this organization', 'not_found', 404)
    }
  }

  const cycle = await db.cycle.create({
    data: {
      orgId: g.ctx!.orgId,
      name: data.name,
      description: data.description || null,
      projectId: data.projectId || null,
      status: data.status ?? 'planned',
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      goal: data.goal || null,
    },
    select: {
      id: true,
      projectId: true,
      name: true,
      description: true,
      status: true,
      startDate: true,
      endDate: true,
      goal: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await emitEvent(g.ctx!.orgId, 'cycle.created', {
    cycle: {
      id: cycle.id,
      projectId: cycle.projectId,
      name: cycle.name,
      status: cycle.status,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    },
  })

  return apiOk({ cycle }, 201)
}
