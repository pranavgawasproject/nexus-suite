import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createChangeRequestSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Change Requests (Module 6 Risk & Issue).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('risk').
 */

// GET /api/v1/change-requests?projectId=&status=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'risk')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const changeRequests = await db.changeRequest.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      status: true,
      impactAssessment: true,
      implementationNotes: true,
      dueDate: true,
      decidedAt: true,
      createdAt: true,
      updatedAt: true,
      requestedBy: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return apiOk({ changeRequests })
}

// POST /api/v1/change-requests — create change request (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'risk', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createChangeRequestSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  if (data.projectId) {
    const project = await db.project.findFirst({
      where: { id: data.projectId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!project) {
      return apiError('projectId not found in your organization', 'not_found', 404)
    }
  }

  const changeRequest = await db.changeRequest.create({
    data: {
      orgId: g.ctx!.orgId,
      projectId: data.projectId || null,
      title: data.title,
      description: data.description || null,
      type: data.type ?? 'minor',
      status: 'pending',
      impactAssessment: data.impactAssessment || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      status: true,
      impactAssessment: true,
      dueDate: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'change_request.created', {
    changeRequest: {
      id: changeRequest.id,
      title: changeRequest.title,
      type: changeRequest.type,
      status: changeRequest.status,
    },
  })

  return apiOk({ changeRequest }, 201)
}
