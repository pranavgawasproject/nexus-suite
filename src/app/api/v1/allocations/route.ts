import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createAllocationSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Resource allocations (Module 4 Resource & Capacity).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('resource').
 */

// GET /api/v1/allocations?userId=&projectId=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'resource')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const projectId = searchParams.get('projectId')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const allocations = await db.allocation.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(userId && userId !== 'all' ? { userId } : {}),
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
    },
    select: {
      id: true,
      userId: true,
      projectId: true,
      allocationPct: true,
      role: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true, designation: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { startDate: 'desc' },
    take: limit,
  })

  return apiOk({ allocations })
}

// POST /api/v1/allocations — create allocation (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'resource', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createAllocationSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const user = await db.user.findFirst({
    where: { id: data.userId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!user) {
    return apiError('userId not found in your organization', 'not_found', 404)
  }

  const project = await db.project.findFirst({
    where: { id: data.projectId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!project) {
    return apiError('projectId not found in your organization', 'not_found', 404)
  }

  const allocation = await db.allocation.create({
    data: {
      orgId: g.ctx!.orgId,
      userId: data.userId,
      projectId: data.projectId,
      allocationPct: data.allocationPct,
      role: data.role || null,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
    select: {
      id: true,
      userId: true,
      projectId: true,
      allocationPct: true,
      role: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true, designation: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'allocation.created', {
    allocation: {
      id: allocation.id,
      userId: allocation.userId,
      projectId: allocation.projectId,
      allocationPct: allocation.allocationPct,
      role: allocation.role,
      startDate: allocation.startDate,
      endDate: allocation.endDate,
    },
  })

  return apiOk({ allocation }, 201)
}
