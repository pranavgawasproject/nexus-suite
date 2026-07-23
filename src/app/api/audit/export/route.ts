import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, withErrors } from '@/lib/api-guard'
import { formatDate } from '@/lib/api'

/**
 * GET /api/audit/export?format=csv|json&from=&to=
 *
 * SOC2/ISO-ready audit log export (PRD §4 Module 10).
 * Returns all audit events for the org, optionally filtered by date range.
 * Designed for export to compliance evidence repositories (Vanta, Drata, etc.).
 *
 * Format:
 *   - csv (default): single CSV with one row per event
 *   - json: nested JSON with metadata + events array
 */
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('governance')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const format = (searchParams.get('format') || 'csv').toLowerCase()
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const logs = await db.auditLog.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 10000, // safety cap
    })

    const org = await db.organization.findUnique({
      where: { id: g.ctx!.org.id },
      select: { name: true, slug: true },
    })

    const filename = `nexus-audit-${org?.slug || 'org'}-${Date.now()}.${format}`

    if (format === 'json') {
      const payload = {
        exportedAt: new Date().toISOString(),
        org: { name: org?.name, slug: org?.slug },
        totalEvents: logs.length,
        dateRange: {
          from: from || logs[0]?.createdAt?.toISOString() || null,
          to: to || logs[logs.length - 1]?.createdAt?.toISOString() || null,
        },
        events: logs.map((l) => ({
          id: l.id,
          timestamp: l.createdAt.toISOString(),
          action: l.action,
          actor: l.actor
            ? { id: l.actor.id, name: l.actor.name, email: l.actor.email }
            : { id: null, name: 'system', email: null },
          entityType: l.entityType,
          entityId: l.entityId,
          metadata: l.metadata ? JSON.parse(l.metadata) : null,
        })),
      }
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      })
    }

    // CSV
    const headers = [
      'timestamp', 'action', 'actor_name', 'actor_email', 'entity_type', 'entity_id', 'metadata',
    ]
    const rows = logs.map((l) => [
      l.createdAt.toISOString(),
      l.action,
      l.actor?.name || 'system',
      l.actor?.email || '',
      l.entityType,
      l.entityId || '',
      l.metadata ? `"${l.metadata.replace(/"/g, '""')}"` : '',
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  })
}

void formatDate
