import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import type { ModuleKey } from '@/lib/modules'

// Toggle a module's state for the current org
export async function POST(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const { org, user } = ctx

  const body = await req.json()
  const moduleKey = body.moduleKey as ModuleKey
  const state = body.state as 'disabled' | 'trial' | 'active' | 'archived'

  if (!moduleKey || !state) {
    return NextResponse.json({ error: 'missing_params' }, { status: 400 })
  }

  // Upsert module state
  const existing = await db.orgModule.findUnique({
    where: { orgId_moduleKey: { orgId: org.id, moduleKey } },
  })

  let record
  if (existing) {
    record = await db.orgModule.update({
      where: { id: existing.id },
      data: {
        state,
        enabledAt: state === 'disabled' ? null : existing.enabledAt ?? new Date(),
        trialEndsAt: state === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
      },
    })
  } else {
    record = await db.orgModule.create({
      data: {
        orgId: org.id,
        moduleKey,
        state,
        enabledAt: state === 'disabled' ? null : new Date(),
        trialEndsAt: state === 'trial' ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) : null,
      },
    })
  }

  // Audit log
  await db.auditLog.create({
    data: {
      orgId: org.id,
      actorId: user?.id,
      action: state === 'disabled' ? 'module.disabled' : 'module.enabled',
      entityType: 'OrgModule',
      entityId: record.id,
      metadata: JSON.stringify({ moduleKey, state }),
    },
  })

  return NextResponse.json({ ok: true, record })
}
