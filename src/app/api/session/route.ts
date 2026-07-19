import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { seedDemoOrg } from '@/lib/seed'
import { MODULE_REGISTRY } from '@/lib/modules'
import type { ModuleKey } from '@/lib/modules'

// Get current session context (org, user, enabled modules).
// Bootstraps a demo org + user on first call if none exists.
export async function GET() {
  await seedDemoOrg()

  const org = await db.organization.findFirst({
    where: { slug: 'acme-design' },
    include: { modules: true },
  })
  if (!org) {
    return NextResponse.json({ user: null, org: null, modules: [] })
  }

  const user = await db.user.findFirst({
    where: { email: 'priya@acme.test' },
  })

  if (!user) {
    return NextResponse.json({ user: null, org, modules: org.modules })
  }

  // Ensure every module from the registry has an OrgModule row.
  const existingKeys = new Set(org.modules.map((m) => m.moduleKey))
  const missing = MODULE_REGISTRY.filter((m) => !existingKeys.has(m.key))
  if (missing.length > 0) {
    await db.orgModule.createMany({
      data: missing.map((m) => ({
        orgId: org.id,
        moduleKey: m.key,
        state: 'disabled',
      })),
    })
  }

  const freshOrg = await db.organization.findFirst({
    where: { slug: 'acme-design' },
    include: { modules: true },
  })

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      designation: user.designation,
      avatarUrl: user.avatarUrl,
      departmentId: user.departmentId,
    },
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      currency: org.currency,
      timezone: org.timezone,
      onboardingDone: org.onboardingDone,
    },
    modules: (freshOrg?.modules ?? org.modules).map((m) => ({
      moduleKey: m.moduleKey as ModuleKey,
      state: m.state as 'disabled' | 'trial' | 'active' | 'archived',
      enabledAt: m.enabledAt,
    })),
  })
}
