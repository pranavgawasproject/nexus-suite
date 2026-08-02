import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, apiOk } from '@/lib/public-api'

/**
 * Public API — Audit Log (Module 10 Governance & Compliance).
 * GET list recent audit entries (read).
 * Module-gated via requirePublicApi('governance').
 *
 * Query: ?action=&entityType=&actorId=&from=&to=&limit=
 * from/to filter on createdAt (ISO 8601).
 */

// GET /api/v1/audit?action=&entityType=&actorId=&from=&to=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'governance')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action')
  const entityType = searchParams.get('entityType')
  const actorId = searchParams.get('actorId')
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const createdAt: { gte?: Date; lte?: Date } = {}
  if (fromStr) {
    const d = new Date(fromStr)
    if (!Number.isNaN(d.getTime())) createdAt.gte = d
  }
  if (toStr) {
    const d = new Date(toStr)
    if (!Number.isNaN(d.getTime())) createdAt.lte = d
  }

  const entries = await db.auditLog.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(actorId ? { actorId } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
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
