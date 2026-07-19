import { NextResponse } from 'next/server'
import { dispatchPending } from '@/lib/webhooks'
import { withErrors } from '@/lib/api-guard'

/**
 * Webhook retry endpoint — designed to be cron'd every minute.
 * Picks up 'pending' and 'retrying' (with nextRetryAt <= now) deliveries
 * and dispatches them with exponential backoff.
 *
 * On self-hosted: call via system cron:
 *   * * * * * curl -fsS -X POST http://localhost:3000/api/webhooks/retry > /dev/null
 *
 * On managed hosting: invoked by a scheduled Lambda/Cloud Run job.
 *
 * Auth: none — endpoint is only callable from localhost in production
 * (enforced by reverse proxy). If exposed externally, add an auth header.
 */
export async function POST() {
  return withErrors(async () => {
    const result = await dispatchPending()
    return NextResponse.json({ ok: true, ...result })
  })
}

export async function GET() {
  return POST()
}
