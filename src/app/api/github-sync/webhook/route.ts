import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyGitHubSignature, handleGitHubWebhook } from '@/lib/github-sync'
import { audit } from '@/lib/api-guard'

/**
 * POST /api/github-sync/webhook?id=<syncId>
 *
 * Inbound GitHub webhook receiver. Verifies the HMAC-SHA256 signature
 * using the sync's webhookSecret, then dispatches to handleGitHubWebhook.
 *
 * Configure in GitHub repo settings → Webhooks → Add webhook:
 *   - Payload URL: https://your-nexus.com/api/github-sync/webhook?id=<syncId>
 *   - Content type: application/json
 *   - Secret: the webhookSecret shown at sync creation
 *   - Events: Issues
 */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const syncId = searchParams.get('id')
  if (!syncId) {
    return NextResponse.json({ error: 'no_id' }, { status: 400 })
  }

  const sync = await db.gitHubSync.findUnique({ where: { id: syncId } })
  if (!sync || !sync.active) {
    return NextResponse.json({ error: 'sync_not_found' }, { status: 404 })
  }

  const payload = await req.text()
  const signature = req.headers.get('x-hub-signature-256') || ''
  const event = req.headers.get('x-github-event') || ''

  // Verify signature
  const valid = await verifyGitHubSignature(payload, signature, sync.webhookSecret)
  if (!valid) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  try {
    const json = JSON.parse(payload)
    await handleGitHubWebhook(syncId, event, json)
    await audit(sync.orgId, undefined, `github_webhook.${event}.${json.action || 'unknown'}`, 'GitHubSync', syncId)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[github-sync] webhook handling failed:', err)
    return NextResponse.json({ error: 'handling_failed', message: err instanceof Error ? err.message : 'unknown' }, { status: 500 })
  }
}

// GitHub sends a GET ping when the webhook is first registered
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const syncId = searchParams.get('id')
  if (!syncId) return NextResponse.json({ error: 'no_id' }, { status: 400 })

  const sync = await db.gitHubSync.findUnique({ where: { id: syncId } })
  if (!sync) return NextResponse.json({ error: 'sync_not_found' }, { status: 404 })

  return NextResponse.json({
    ok: true,
    message: 'GitHub webhook endpoint is active. Configure your webhook at the URL shown in the sync settings.',
    sync: { repoOwner: sync.repoOwner, repoName: sync.repoName, active: sync.active },
  })
}
