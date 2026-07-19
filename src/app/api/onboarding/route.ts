import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import type { ModuleKey } from '@/lib/modules'

// Complete onboarding: enable chosen modules, mark org onboarded, create audit entries.
export async function POST(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const { org, user } = ctx

  const body = await req.json()
  const moduleKeys = (body.moduleKeys ?? []) as ModuleKey[]
  const bundleId = body.bundleId as string

  if (!Array.isArray(moduleKeys) || moduleKeys.length === 0) {
    return NextResponse.json({ error: 'no_modules' }, { status: 400 })
  }

  // Reset every module to disabled first, then enable the chosen ones.
  await db.orgModule.updateMany({
    where: { orgId: org.id },
    data: { state: 'disabled', enabledAt: null, trialEndsAt: null },
  })

  for (const key of moduleKeys) {
    const existing = await db.orgModule.findUnique({
      where: { orgId_moduleKey: { orgId: org.id, moduleKey: key } },
    })
    if (existing) {
      await db.orgModule.update({
        where: { id: existing.id },
        data: { state: 'active', enabledAt: new Date() },
      })
    } else {
      await db.orgModule.create({
        data: { orgId: org.id, moduleKey: key, state: 'active', enabledAt: new Date() },
      })
    }
    await db.auditLog.create({
      data: {
        orgId: org.id,
        actorId: user?.id,
        action: 'module.enabled',
        entityType: 'OrgModule',
        metadata: JSON.stringify({ moduleKey: key, via: 'onboarding', bundleId }),
      },
    })
  }

  // Mark org onboarded
  await db.organization.update({
    where: { id: org.id },
    data: { onboardingDone: true },
  })

  await db.auditLog.create({
    data: {
      orgId: org.id,
      actorId: user?.id,
      action: 'onboarding.completed',
      entityType: 'Organization',
      entityId: org.id,
      metadata: JSON.stringify({ bundleId, modules: moduleKeys }),
    },
  })

  return NextResponse.json({ ok: true })
}
