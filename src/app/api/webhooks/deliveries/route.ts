import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { withErrors } from '@/lib/api-guard'

/**
 * GET /api/webhooks/deliveries
 * List recent webhook delivery attempts for the current org (last 20 by default).
 * Optional query: ?webhookId=... &limit= (max 100)
 */
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const webhookId = searchParams.get('webhookId')
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')))

    // Scope to org via webhook relation
    const where: {
      webhook: { orgId: string; id?: string }
    } = {
      webhook: { orgId: ctx.org.id },
    }
    if (webhookId) {
      where.webhook.id = webhookId
    }

    const deliveries = await db.webhookDelivery.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        webhookId: true,
        event: true,
        status: true,
        responseCode: true,
        attempt: true,
        nextRetryAt: true,
        deliveredAt: true,
        createdAt: true,
        webhook: { select: { url: true } },
      },
    })

    return NextResponse.json({
      deliveries: deliveries.map((d) => ({
        id: d.id,
        webhookId: d.webhookId,
        webhookUrl: d.webhook.url,
        event: d.event,
        status: d.status,
        responseCode: d.responseCode,
        attempt: d.attempt,
        nextRetryAt: d.nextRetryAt,
        deliveredAt: d.deliveredAt,
        createdAt: d.createdAt,
      })),
    })
  })
}
