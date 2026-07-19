import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { parseBody, audit, withErrors } from '@/lib/api-guard'
import { z } from 'zod'
import { randomBytes } from 'crypto'

const createWebhookSchema = z.object({
  url: z.string().url('Must be a valid URL').refine(
    (u) => u.startsWith('http://') || u.startsWith('https://'),
    'URL must be http(s)://'
  ),
  events: z.string().default('*'),
  active: z.boolean().optional().default(true),
})

// GET /api/webhooks — list webhooks for the current org
export async function GET() {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const webhooks = await db.webhook.findMany({
      where: { orgId: ctx.org.id },
      include: {
        _count: {
          select: {
            deliveries: {
              where: { status: { in: ['pending', 'retrying'] } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      webhooks: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        events: w.events,
        active: w.active,
        lastResponseCode: w.lastResponseCode,
        lastSuccessAt: w.lastSuccessAt,
        lastFailureAt: w.lastFailureAt,
        failureCount: w.failureCount,
        pendingDeliveries: w._count.deliveries,
        createdAt: w.createdAt,
        // secret is NOT returned after creation — show only first 4 chars for identification
        secretPrefix: w.secret.slice(0, 4) + '...',
      })),
    })
  })
}

// POST /api/webhooks — create a webhook. Secret is generated and shown ONCE.
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { data, error } = await parseBody(req, createWebhookSchema)
    if (error) return error

    const secret = 'whsec_' + randomBytes(24).toString('hex')

    const webhook = await db.webhook.create({
      data: {
        orgId: ctx.org.id,
        url: data.url,
        events: data.events,
        active: data.active,
        secret,
      },
    })

    await audit(ctx.org.id, ctx.user?.id, 'webhook.created', 'Webhook', webhook.id, {
      url: webhook.url,
      events: webhook.events,
    })

    return NextResponse.json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        createdAt: webhook.createdAt,
      },
      // The secret is shown ONCE here. Store it on the receiving service immediately.
      secret,
      message: 'Save this secret — it will not be shown again.',
    })
  })
}

// DELETE /api/webhooks?id=... — delete a webhook
export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    await db.webhook.delete({ where: { id, orgId: ctx.org.id } })
    await audit(ctx.org.id, ctx.user?.id, 'webhook.deleted', 'Webhook', id)
    return NextResponse.json({ ok: true })
  })
}
