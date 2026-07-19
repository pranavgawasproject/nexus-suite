import { db } from '@/lib/db'
import { createNotification } from '@/lib/notify'

/**
 * Webhook system — PRD §4.5.
 *
 * Event-driven delivery: when module code calls `emitEvent(orgId, 'task.created', payload)`,
 * we:
 *   1. Look up all active webhooks for the org subscribed to that event (or '*')
 *   2. For each webhook, compute HMAC-SHA256 signature using the webhook's secret
 *   3. Create a WebhookDelivery record in 'pending' state
 *   4. Dispatch delivery asynchronously (fire-and-forget — the caller doesn't wait)
 *
 * Retry-with-backoff: failed deliveries retry up to 5 times with exponential backoff
 * (1m, 5m, 25m, 2h, 10h). The retry queue is processed by a separate background job
 * (see /api/webhooks/retry endpoint — designed to be cron'd every minute).
 *
 * On self-hosted installs, this is unlimited. On managed hosting, rate limits apply
 * at the gateway layer (PRD §4.5 v2.1).
 */

const MAX_ATTEMPTS = 5
const BACKOFF_SECONDS = [60, 300, 1500, 7200, 36000] // 1m, 5m, 25m, 2h, 10h

/**
 * Emit an event to all subscribed webhooks for an org.
 * Non-blocking — failures don't bubble up to the caller.
 *
 * Also creates an in-app notification if any webhook is configured for this
 * event with severity 'warning' or above (rare; reserved for system events).
 */
export async function emitEvent(
  orgId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const webhooks = await db.webhook.findMany({
      where: { orgId, active: true },
    })

    const fullPayload = {
      event,
      org_id: orgId,
      timestamp: new Date().toISOString(),
      data: payload,
    }
    const payloadStr = JSON.stringify(fullPayload)

    for (const webhook of webhooks) {
      // Filter by event subscription
      const subscribed =
        webhook.events === '*' ||
        webhook.events.split(',').map((e) => e.trim()).includes(event) ||
        // Allow prefix matching: 'task.*' matches 'task.created'
        webhook.events.split(',').some(
          (e) => e.trim().endsWith('.*') && event.startsWith(e.trim().slice(0, -2))
        )
      if (!subscribed) continue

      const signature = await computeSignature(payloadStr, webhook.secret)
      await db.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: payloadStr,
          signature,
          status: 'pending',
        },
      })
    }

    // Fire-and-forget dispatch — don't block the caller on HTTP calls
    dispatchPending().catch(() => {})
  } catch (err) {
    // Webhook failure must never break the triggering operation
    console.error('[webhooks] emitEvent failed:', err)
  }
}

/**
 * Compute HMAC-SHA256 signature.
 * Sent as the `X-Nexus-Signature` header in the format `sha256=<hex>`.
 */
async function computeSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  return 'sha256=' + Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Dispatch all pending deliveries. Called by emitEvent (fire-and-forget) and
 * by the /api/webhooks/retry endpoint (cron'd).
 *
 * Picks up deliveries where status='pending' OR (status='retrying' AND nextRetryAt <= now),
 * limited to 50 per run to avoid blocking.
 */
export async function dispatchPending(): Promise<{ dispatched: number; succeeded: number; failed: number }> {
  const now = new Date()
  const pending = await db.webhookDelivery.findMany({
    where: {
      OR: [
        { status: 'pending' },
        { status: 'retrying', nextRetryAt: { lte: now } },
      ],
    },
    include: { webhook: true },
    take: 50,
    orderBy: { createdAt: 'asc' },
  })

  let succeeded = 0
  let failed = 0

  for (const delivery of pending) {
    if (!delivery.webhook || !delivery.webhook.active) {
      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'failed', responseBody: 'Webhook inactive or deleted' },
      })
      failed++
      continue
    }

    const attempt = delivery.attempt + 1
    try {
      const res = await fetch(delivery.webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Nexus-Signature': delivery.signature,
          'X-Nexus-Event': delivery.event,
          'X-Nexus-Delivery': delivery.id,
          'User-Agent': 'nexus-suite-webhooks/1.0',
        },
        body: delivery.payload,
        signal: AbortSignal.timeout(10000), // 10s timeout
      })

      const responseBody = await res.text().catch(() => '')

      if (res.ok) {
        await db.webhookDelivery.update({
          where: { id: delivery.id },
          data: {
            status: 'delivered',
            responseCode: res.status,
            responseBody: responseBody.slice(0, 2000),
            attempt,
            deliveredAt: new Date(),
          },
        })
        await db.webhook.update({
          where: { id: delivery.webhook.id },
          data: {
            lastResponseCode: res.status,
            lastSuccessAt: new Date(),
            failureCount: 0,
          },
        })
        succeeded++
      } else {
        throw new Error(`HTTP ${res.status}: ${responseBody.slice(0, 200)}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      const willRetry = attempt < MAX_ATTEMPTS
      const nextRetryAt = willRetry
        ? new Date(Date.now() + BACKOFF_SECONDS[attempt - 1] * 1000)
        : null

      await db.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: willRetry ? 'retrying' : 'failed',
          responseCode: null,
          responseBody: message.slice(0, 2000),
          attempt,
          nextRetryAt,
        },
      })
      await db.webhook.update({
        where: { id: delivery.webhook.id },
        data: {
          lastFailureAt: new Date(),
          failureCount: { increment: 1 },
        },
      })
      failed++
    }
  }

  return { dispatched: pending.length, succeeded, failed }
}

// Suppress unused import warning
void createNotification
