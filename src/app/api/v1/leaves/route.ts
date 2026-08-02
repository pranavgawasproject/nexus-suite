import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createLeaveSchema, updateLeaveSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * GET /api/v1/leaves — list leave requests for the org (read scope).
 * Optional query: ?userId=, ?status=, ?limit= (max 100)
 */
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'leave')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const status = searchParams.get('status')
  const limit = Math.min(100, Number(searchParams.get('limit') || '50'))

  const leaves = await db.leave.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(userId ? { userId } : {}),
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      halfDay: true,
      status: true,
      reason: true,
      appliedAt: true,
      decidedAt: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
      approverNote: true,
    },
    orderBy: { startDate: 'desc' },
    take: limit,
  })

  return apiOk({ leaves })
}

/**
 * POST /api/v1/leaves — submit a leave request (write scope).
 * Body matches createLeaveSchema (userId, type, startDate, endDate, ...).
 * userId must belong to the authenticated org.
 */
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'leave', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createLeaveSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const user = await db.user.findFirst({
    where: { id: data.userId, orgId: g.ctx!.orgId },
    select: { id: true, name: true, reportingManagerId: true },
  })
  if (!user) {
    return apiError('userId does not belong to this organization', 'not_found', 404)
  }

  const leave = await db.leave.create({
    data: {
      orgId: g.ctx!.orgId,
      userId: data.userId,
      type: data.type,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      halfDay: data.halfDay ?? false,
      status: 'pending',
      reason: data.reason || null,
    },
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      halfDay: true,
      status: true,
      reason: true,
      appliedAt: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'leave.created', {
    leave: {
      id: leave.id,
      userId: data.userId,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      status: leave.status,
    },
  })

  return apiOk({ leave }, 201)
}

/**
 * PATCH /api/v1/leaves — approve / reject / cancel a pending leave (write scope).
 * Body: updateLeaveSchema — id (required), status, optional approverNote.
 * Only pending leaves can be updated; decidedAt is set on transition.
 */
export async function PATCH(req: NextRequest) {
  const g = await requirePublicApi(req, 'leave', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, updateLeaveSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const existing = await db.leave.findFirst({
    where: { id: data.id, orgId: g.ctx!.orgId },
  })
  if (!existing) {
    return apiError('Leave not found', 'not_found', 404)
  }
  if (existing.status !== 'pending') {
    return apiError(`Leave already ${existing.status}`, 'invalid_state', 400)
  }

  // Prefer an org admin as attributed approver for API-key driven decisions
  const adminUser = await db.user.findFirst({
    where: { orgId: g.ctx!.orgId, role: 'admin' },
    select: { id: true },
  })

  const leave = await db.leave.update({
    where: { id: data.id },
    data: {
      status: data.status,
      approverId: adminUser?.id ?? null,
      approverNote: data.approverNote ?? null,
      decidedAt: new Date(),
    },
    select: {
      id: true,
      type: true,
      startDate: true,
      endDate: true,
      halfDay: true,
      status: true,
      reason: true,
      appliedAt: true,
      decidedAt: true,
      approverNote: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, `leave.${data.status}`, {
    leave: {
      id: leave.id,
      userId: leave.user.id,
      type: leave.type,
      status: leave.status,
      decidedAt: leave.decidedAt,
    },
  })

  return apiOk({ leave })
}
