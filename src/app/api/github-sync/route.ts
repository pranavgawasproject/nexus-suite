import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { parseBody, audit, withErrors } from '@/lib/api-guard'
import { createGitHubSync } from '@/lib/github-sync'
import { z } from 'zod'

const createSyncSchema = z.object({
  repoOwner: z.string().min(1).max(100),
  repoName: z.string().min(1).max(100),
  projectId: z.string().min(1),
  githubToken: z.string().optional(),
  syncDirection: z.enum(['one_way_out', 'one_way_in', 'two_way']).optional().default('two_way'),
  defaultAssignee: z.string().optional(),
})

// GET /api/github-sync — list syncs for the org
export async function GET() {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const syncs = await db.gitHubSync.findMany({
      where: { orgId: ctx.org.id },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { issueMaps: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      syncs: syncs.map((s) => ({
        id: s.id,
        repoOwner: s.repoOwner,
        repoName: s.repoName,
        repoFullName: `${s.repoOwner}/${s.repoName}`,
        project: s.project,
        active: s.active,
        syncDirection: s.syncDirection,
        defaultAssignee: s.defaultAssignee,
        lastSyncAt: s.lastSyncAt,
        lastSyncError: s.lastSyncError,
        mappedIssues: s._count.issueMaps,
        hasToken: !!s.githubTokenHash,
        webhookSecretPrefix: s.webhookSecret.slice(0, 8) + '...',
        createdAt: s.createdAt,
      })),
    })
  })
}

// POST /api/github-sync — create a new sync
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { data, error } = await parseBody(req, createSyncSchema)
    if (error) return error

    // Verify the project belongs to this org
    const project = await db.project.findFirst({
      where: { id: data.projectId, orgId: ctx.org.id },
    })
    if (!project) return NextResponse.json({ error: 'project_not_found' }, { status: 404 })

    // Check for duplicate
    const existing = await db.gitHubSync.findUnique({
      where: { orgId_repoOwner_repoName: { orgId: ctx.org.id, repoOwner: data.repoOwner, repoName: data.repoName } },
    })
    if (existing) {
      return NextResponse.json({ error: 'sync_already_exists', message: 'This repo is already synced' }, { status: 409 })
    }

    const sync = await createGitHubSync(ctx.org.id, data)
    await audit(ctx.org.id, ctx.user?.id, 'github_sync.created', 'GitHubSync', sync.id, {
      repo: `${data.repoOwner}/${data.repoName}`,
      projectId: data.projectId,
    })

    return NextResponse.json({
      sync: { id: sync.id, repoOwner: sync.repoOwner, repoName: sync.repoName },
      webhookSecret: sync.webhookSecret,
      message: 'Save this webhook secret — you\'ll need it to configure the GitHub webhook.',
      webhookUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/github-sync/webhook?id=${sync.id}`,
      webhookEvents: ['issues'],
    })
  })
}

// DELETE /api/github-sync?id=...
export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    await db.gitHubSync.delete({ where: { id, orgId: ctx.org.id } })
    await audit(ctx.org.id, ctx.user?.id, 'github_sync.deleted', 'GitHubSync', id)
    return NextResponse.json({ ok: true })
  })
}
