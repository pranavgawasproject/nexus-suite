import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { withErrors } from '@/lib/api-guard'
import { runAdminCopilot } from '@/lib/ai'

/**
 * POST /api/ai/admin-copilot
 * Runs governance/compliance checks + KPI suggestions for admins.
 */
export async function POST() {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const [policiesRaw, usersCount, apiKeysCount, webhooksCount, modulesEnabled, auditLogsCount] = await Promise.all([
      db.policy.findMany({ where: { orgId: ctx.org.id } }),
      db.user.count({ where: { orgId: ctx.org.id } }),
      db.apiKey.count({ where: { orgId: ctx.org.id, revokedAt: null } }),
      db.webhook.count({ where: { orgId: ctx.org.id } }),
      db.orgModule.findMany({ where: { orgId: ctx.org.id, state: { in: ['active', 'trial'] } } }),
      db.auditLog.count({ where: { orgId: ctx.org.id } }),
    ])

    const policies = policiesRaw.map((p) => ({
      type: p.type,
      name: p.name,
      active: p.active,
      config: JSON.parse(p.config) as Record<string, unknown>,
    }))

    const result = await runAdminCopilot({
      policies,
      orgStats: {
        usersCount,
        apiKeysCount,
        webhooksCount,
        modulesEnabled: modulesEnabled.map((m) => m.moduleKey),
        auditLogsCount,
      },
    })

    return NextResponse.json(result)
  })
}
