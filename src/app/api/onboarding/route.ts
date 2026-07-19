import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { parseBody, audit, withErrors } from '@/lib/api-guard'
import { completeOnboardingSchema } from '@/lib/schemas'
import type { ModuleKey } from '@/lib/modules'

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
    const { org, user } = ctx

    const { data, error } = await parseBody(req, completeOnboardingSchema)
    if (error) return error

    const moduleKeys = data.moduleKeys as ModuleKey[]

    // Reset every module to disabled, then enable the chosen ones
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
      await audit(org.id, user?.id, 'module.enabled', 'OrgModule', undefined, {
        moduleKey: key,
        via: 'onboarding',
        bundleId: data.bundleId,
      })
    }

    await db.organization.update({
      where: { id: org.id },
      data: { onboardingDone: true },
    })

    await audit(org.id, user?.id, 'onboarding.completed', 'Organization', org.id, {
      bundleId: data.bundleId,
      modules: moduleKeys,
    })

    return NextResponse.json({ ok: true })
  })
}
