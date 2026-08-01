import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, apiOk } from '@/lib/public-api'

/**
 * Public API — Audit Log (Module 10 Governance & Compliance).
 * GET list recent audit entries (read).
 * Module-gated via requirePublicApi('governance').
 */

// GET /api/v1/audit?action=&entityType=&actorId=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'governance')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const entityType = searchParams.get('entityType')
  const actorId = searchParams.get('actorId')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const entries = await db.auditLog.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(actorId ? { actorId } : {}),
    },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      actorId: true,
      metadata: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
  })

  return apiOk({ audit: entries })
}
