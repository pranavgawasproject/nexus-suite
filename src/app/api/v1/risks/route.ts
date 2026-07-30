import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createRiskSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Risk register (Module 6).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('risk').
 */

// GET /api/v1/risks?projectId=&status=&category=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'risk')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const risks = await db.risk.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(category && category !== 'all' ? { category } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      likelihood: true,
      impact: true,
      severity: true,
      status: true,
      mitigation: true,
      dueDate: true,
      closedAt: true,
      createdAt: true,
      updatedAt: true,
      owner: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ severity: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
  })

  return apiOk({ risks })
}

// POST /api/v1/risks — create risk (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'risk', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createRiskSchema)
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

  if (data.ownerId) {
    const owner = await db.user.findFirst({
      where: { id: data.ownerId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!owner) {
      return apiError('ownerId not found in your organization', 'not_found', 404)
    }
  }

  const severity = data.likelihood * data.impact
  const risk = await db.risk.create({
    data: {
      orgId: g.ctx!.orgId,
      projectId: data.projectId || null,
      title: data.title,
      description: data.description || null,
      category: data.category,
      likelihood: data.likelihood,
      impact: data.impact,
      severity,
      status: data.status,
      ownerId: data.ownerId || null,
      mitigation: data.mitigation || null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      likelihood: true,
      impact: true,
      severity: true,
      status: true,
      mitigation: true,
      dueDate: true,
      createdAt: true,
      owner: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'risk.created', {
    risk: {
      id: risk.id,
      title: risk.title,
      severity: risk.severity,
      status: risk.status,
      category: risk.category,
    },
  })

  return apiOk({ risk }, 201)
}
