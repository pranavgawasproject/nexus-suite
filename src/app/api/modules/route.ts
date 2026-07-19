import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { parseBody, audit, withErrors } from '@/lib/api-guard'
import { toggleModuleSchema } from '@/lib/schemas'
import type { ModuleKey } from '@/lib/modules'

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
    const { org, user } = ctx

    const { data, error } = await parseBody(req, toggleModuleSchema)
    if (error) return error

    const moduleKey = data.moduleKey as ModuleKey
    const state = data.state

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

    await audit(org.id, user?.id, state === 'disabled' ? 'module.disabled' : 'module.enabled', 'OrgModule', record.id, {
      moduleKey,
      state,
    })

    return NextResponse.json({ ok: true, record })
  })
}
