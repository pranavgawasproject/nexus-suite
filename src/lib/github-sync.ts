import { db } from '@/lib/db'
import { createNotification } from '@/lib/notify'
import { randomBytes } from 'crypto'

/**
 * Two-way GitHub sync — Tasks ↔ GitHub Issues.
 *
 * Inspired by Huly & Plane. Lets a team link a Nexus Suite project to a
 * GitHub repo and sync tasks/issues bi-directionally:
 *
 *   - Nexus → GitHub: when a task is created/updated, create/update the
 *     corresponding GitHub issue.
 *   - GitHub → Nexus: when a GitHub issue is created/updated/commented
 *     via webhook, update the corresponding Nexus task.
 *
 * Auth model:
 *   - Outbound (Nexus → GitHub) requires a GitHub PAT with `repo` scope,
 *     stored bcrypt-hashed in GitHubSync.githubTokenHash.
 *   - Inbound (GitHub → Nexus) uses GitHub webhook with HMAC-SHA256
 *     signature verification using GitHubSync.webhookSecret.
 *
 * Sync direction options:
 *   - "two_way"      — both directions (default)
 *   - "one_way_out"  — Nexus → GitHub only
 *   - "one_way_in"   — GitHub → Nexus only
 */

const GITHUB_API = 'https://api.github.com'

export interface GitHubSyncConfig {
  repoOwner: string
  repoName: string
  projectId: string
  githubToken?: string  // raw PAT — hashed before storage
  syncDirection?: 'one_way_out' | 'one_way_in' | 'two_way'
  defaultAssignee?: string
  labelMapping?: Record<string, string>
  statusMapping?: Record<string, string>
}

/**
 * Create a new GitHub sync configuration for a project.
 * Generates a webhook secret for inbound verification.
 */
export async function createGitHubSync(orgId: string, config: GitHubSyncConfig) {
  const bcrypt = await import('bcryptjs')
  const webhookSecret = 'ghwh_' + randomBytes(24).toString('hex')

  const sync = await db.gitHubSync.create({
    data: {
      orgId,
      repoOwner: config.repoOwner,
      repoName: config.repoName,
      projectId: config.projectId,
      githubTokenHash: config.githubToken ? await bcrypt.hash(config.githubToken, 10) : null,
      webhookSecret,
      syncDirection: config.syncDirection || 'two_way',
      defaultAssignee: config.defaultAssignee || null,
      labelMapping: config.labelMapping ? JSON.stringify(config.labelMapping) : null,
      statusMapping: config.statusMapping ? JSON.stringify(config.statusMapping) : null,
    },
  })

  return sync
}

/**
 * Verify a GitHub webhook signature.
 * GitHub sends `X-Hub-Signature-256: sha256=<hex>` header.
 */
export async function verifyGitHubSignature(
  payload: string,
  signatureHeader: string,
  webhookSecret: string
): Promise<boolean> {
  if (!signatureHeader.startsWith('sha256=')) return false
  const expected = signatureHeader.slice(7)
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  // Constant-time comparison
  if (computed.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Sync a Nexus task to GitHub (create or update the corresponding issue).
 * Called when a task is created/updated in Nexus.
 */
export async function syncTaskToGitHub(orgId: string, taskId: string): Promise<void> {
  const task = await db.task.findUnique({
    where: { id: taskId, orgId },
    include: { project: { include: { githubSyncs: true } } },
  })
  if (!task || !task.project.githubSyncs.length) return

  for (const sync of task.project.githubSyncs) {
    if (!sync.active) continue
    if (sync.syncDirection === 'one_way_in') continue
    if (!sync.githubTokenHash) continue

    // Decrypt PAT (here we just re-fetch — in production, store encrypted)
    // For MVP: we require the PAT to be re-provided via env or re-entered.
    // This is a known limitation — see docs/GITHUB_SYNC.md
    const pat = process.env.GITHUB_SYNC_PAT // org-level PAT for outbound
    if (!pat) {
      await updateSyncError(sync.id, 'GITHUB_SYNC_PAT env var not set')
      continue
    }

    try {
      const existing = await db.gitHubIssueMap.findUnique({
        where: { githubSyncId_taskId: { githubSyncId: sync.id, taskId: task.id } },
      })

      const statusMapping = sync.statusMapping ? JSON.parse(sync.statusMapping) : defaultStatusMapping
      const githubState = statusMapping[task.status] || 'open'

      if (existing) {
        // Update existing issue
        await updateGitHubIssue(pat, sync.repoOwner, sync.repoName, existing.githubIssueNumber, {
          title: task.title,
          body: task.description || '',
          state: githubState as 'open' | 'closed',
        })
        await db.gitHubIssueMap.update({
          where: { id: existing.id },
          data: {
            lastSyncedAt: new Date(),
            lastSyncDirection: 'out',
            nexusUpdatedAt: task.updatedAt,
          },
        })
      } else {
        // Create new issue
        const issue = await createGitHubIssue(pat, sync.repoOwner, sync.repoName, {
          title: task.title,
          body: task.description || '',
          labels: buildLabels(task, sync.labelMapping ? JSON.parse(sync.labelMapping) : null),
        })
        await db.gitHubIssueMap.create({
          data: {
            orgId,
            githubSyncId: sync.id,
            taskId: task.id,
            githubIssueNumber: issue.number,
            githubIssueUrl: issue.html_url,
            githubNodeId: issue.node_id,
            lastSyncDirection: 'out',
            nexusUpdatedAt: task.updatedAt,
            githubUpdatedAt: new Date(issue.updated_at),
          },
        })
      }
      await clearSyncError(sync.id)
    } catch (err) {
      await updateSyncError(sync.id, err instanceof Error ? err.message : 'Unknown error')
    }
  }
}

/**
 * Handle an inbound GitHub webhook event.
 * Updates the corresponding Nexus task based on GitHub issue changes.
 */
export async function handleGitHubWebhook(
  syncId: string,
  event: string,
  payload: any
): Promise<void> {
  const sync = await db.gitHubSync.findUnique({ where: { id: syncId } })
  if (!sync || !sync.active) return
  if (sync.syncDirection === 'one_way_out') return

  if (event === 'issues' && (payload.action === 'opened' || payload.action === 'reopened')) {
    // Create a new Nexus task from a GitHub issue
    if (!payload.issue) return
    const existing = await db.gitHubIssueMap.findUnique({
      where: { githubSyncId_githubIssueNumber: { githubSyncId: sync.id, githubIssueNumber: payload.issue.number } },
    })
    if (existing) return // already mapped

    const statusMapping = sync.statusMapping ? JSON.parse(sync.statusMapping) : defaultStatusMapping
    const reverseStatus = reverseMap(statusMapping, payload.issue.state || 'open')

    const task = await db.task.create({
      data: {
        orgId: sync.orgId,
        projectId: sync.projectId,
        title: payload.issue.title,
        description: payload.issue.body || '',
        status: reverseStatus || 'todo',
        priority: 'medium',
        type: 'task',
        tags: 'github-sync',
      },
    })
    await db.gitHubIssueMap.create({
      data: {
        orgId: sync.orgId,
        githubSyncId: sync.id,
        taskId: task.id,
        githubIssueNumber: payload.issue.number,
        githubIssueUrl: payload.issue.html_url,
        githubNodeId: payload.issue.node_id,
        lastSyncDirection: 'in',
        githubUpdatedAt: new Date(payload.issue.updated_at),
      },
    })
    // Notify the team
    const orgAdmins = await db.user.findMany({ where: { orgId: sync.orgId, role: 'admin' } })
    await Promise.all(orgAdmins.map((a) => createNotification(sync.orgId, a.id, {
      title: 'New task from GitHub',
      body: `Issue #${payload.issue.number} "${payload.issue.title}" synced from ${sync.repoOwner}/${sync.repoName}.`,
      category: 'task',
      link: 'tasks',
    })))
  } else if (event === 'issues' && (payload.action === 'closed' || payload.action === 'edited')) {
    // Update existing Nexus task
    if (!payload.issue) return
    const map = await db.gitHubIssueMap.findUnique({
      where: { githubSyncId_githubIssueNumber: { githubSyncId: sync.id, githubIssueNumber: payload.issue.number } },
    })
    if (!map) return

    const statusMapping = sync.statusMapping ? JSON.parse(sync.statusMapping) : defaultStatusMapping
    const newStatus = payload.action === 'closed' ? statusMapping['done'] : undefined

    await db.task.update({
      where: { id: map.taskId },
      data: {
        ...(payload.issue.title && { title: payload.issue.title }),
        ...(payload.issue.body !== undefined && { description: payload.issue.body }),
        ...(newStatus && { status: newStatus }),
      },
    })
    await db.gitHubIssueMap.update({
      where: { id: map.id },
      data: {
        lastSyncedAt: new Date(),
        lastSyncDirection: 'in',
        githubUpdatedAt: new Date(payload.issue.updated_at),
      },
    })
  }
}

// --- GitHub API helpers ---

async function createGitHubIssue(pat: string, owner: string, repo: string, data: { title: string; body: string; labels?: string[] }) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'nexus-suite-github-sync',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub API ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json() as Promise<{ number: number; html_url: string; node_id: string; updated_at: string }>
}

async function updateGitHubIssue(pat: string, owner: string, repo: string, issueNumber: number, data: { title: string; body: string; state: 'open' | 'closed' }) {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${pat}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'nexus-suite-github-sync',
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GitHub API ${res.status}: ${err.slice(0, 200)}`)
  }
  return res.json()
}

function buildLabels(task: { priority: string; type: string }, mapping: Record<string, string> | null): string[] {
  const labels: string[] = []
  if (mapping) {
    const p = mapping[`priority_${task.priority}`]
    if (p) labels.push(p)
    const t = mapping[`type_${task.type}`]
    if (t) labels.push(t)
  } else {
    labels.push(`priority:${task.priority}`)
    if (task.type !== 'task') labels.push(`type:${task.type}`)
  }
  return labels
}

function reverseMap(mapping: Record<string, string>, value: string): string | undefined {
  for (const [k, v] of Object.entries(mapping)) {
    if (v === value) return k
  }
  return undefined
}

async function updateSyncError(syncId: string, error: string) {
  await db.gitHubSync.update({ where: { id: syncId }, data: { lastSyncError: error } })
}

async function clearSyncError(syncId: string) {
  await db.gitHubSync.update({ where: { id: syncId }, data: { lastSyncError: null, lastSyncAt: new Date() } })
}

const defaultStatusMapping: Record<string, string> = {
  todo: 'open',
  in_progress: 'open',
  in_review: 'open',
  done: 'closed',
  blocked: 'open',
}
