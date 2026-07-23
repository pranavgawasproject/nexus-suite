/**
 * Next.js instrumentation file — runs once on server startup.
 *
 * Starts an in-process webhook delivery scheduler that polls for pending
 * deliveries every 60 seconds. This is a lightweight alternative to requiring
 * a system cron job (though the /api/webhooks/retry endpoint remains
 * available for environments that prefer external cron).
 *
 * In production with multiple replicas, you should use external cron instead
 * to avoid duplicate delivery attempts. This in-process scheduler is
 * primarily for self-hosted single-instance deployments.
 */

export async function register() {
  // Only run in the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { dispatchPending } = await import('./lib/webhooks')

    const POLL_INTERVAL_MS = 60_000 // 1 minute
    let running = false

    const tick = async () => {
      if (running) return
      running = true
      try {
        await dispatchPending()
      } catch (err) {
        console.error('[webhook-scheduler] tick failed:', err)
      } finally {
        running = false
      }
    }

    // Initial dispatch after 10s (let the server warm up)
    setTimeout(tick, 10_000)
    // Then every minute
    setInterval(tick, POLL_INTERVAL_MS)

    console.log(`[webhook-scheduler] Started — polling every ${POLL_INTERVAL_MS / 1000}s`)
  }
}
