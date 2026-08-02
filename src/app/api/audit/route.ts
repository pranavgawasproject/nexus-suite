import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

/**
 * GET /api/audit — recent audit log entries for the current org.
 * Optional query filters (good-first-issue / governance):
 *   ?from=ISO8601  — createdAt >= from
 *   ?to=ISO8601    — createdAt <= to
 *   ?actorId=      — filter by actor user id
 *   ?action=       — e.g. task.created
 *   ?entityType=   — e.g. Task, Leave
 *   ?limit=        — max 200, default 100
 */
export async function GET(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ logs: [] })

  const { searchParams } = new URL(req.url)
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const actorId = searchParams.get('actorId')
  const action = searchParams.get('action')
  const entityType = searchParams.get('entityType')
  const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '100') || 100))

  const createdAt: { gte?: Date; lte?: Date } = {}
  if (fromStr) {
    const d = new Date(fromStr)
    if (!Number.isNaN(d.getTime())) createdAt.gte = d
  }
  if (toStr) {
    const d = new Date(toStr)
    if (!Number.isNaN(d.getTime())) createdAt.lte = d
  }

  const logs = await db.auditLog.findMany({
    where: {
      orgId: ctx.org.id,
      ...(actorId ? { actorId } : {}),
      ...(action ? { action } : {}),
      ...(entityType ? { entityType } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return NextResponse.json({ logs })
}
