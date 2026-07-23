import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { upsertPolicySchema } from '@/lib/schemas'

// GET /api/policies — list all governance policies for the org
export async function GET() {
  return withErrors(async () => {
    const g = await requireModule('governance')
    if (g.response) return g.response

    const policies = await db.policy.findMany({
      where: { orgId: g.ctx!.org.id },
      include: { updatedBy: { select: { id: true, name: true } } },
      orderBy: { type: 'asc' },
    })

    return NextResponse.json({
      policies: policies.map((p) => ({
        id: p.id,
        type: p.type,
        name: p.name,
        config: JSON.parse(p.config),
        active: p.active,
        updatedAt: p.updatedAt,
        updatedBy: p.updatedBy,
      })),
    })
  })
}

// POST /api/policies — upsert (one policy per type per org)
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('governance')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, upsertPolicySchema)
    if (error) return error

    const configStr = JSON.stringify(data.config)
    const existing = await db.policy.findUnique({
      where: { orgId_type: { orgId: g.ctx!.org.id, type: data.type } },
    })

    let policy
    if (existing) {
      policy = await db.policy.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          config: configStr,
          active: data.active,
          updatedById: g.ctx!.user?.id,
        },
      })
    } else {
      policy = await db.policy.create({
        data: {
          orgId: g.ctx!.org.id,
          type: data.type,
          name: data.name,
          config: configStr,
          active: data.active,
          updatedById: g.ctx!.user?.id,
        },
      })
    }

    await audit(g.ctx!.org.id, g.ctx!.user?.id, `policy.${existing ? 'updated' : 'created'}`, 'Policy', policy.id, {
      type: policy.type, name: policy.name,
    })
    return NextResponse.json({
      policy: {
        id: policy.id,
        type: policy.type,
        name: policy.name,
        config: JSON.parse(policy.config),
        active: policy.active,
        updatedAt: policy.updatedAt,
      },
    })
  })
}

// DELETE /api/policies?type=retention
export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('governance')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    if (!type) return NextResponse.json({ error: 'no_type' }, { status: 400 })
    await db.policy.deleteMany({ where: { orgId: g.ctx!.org.id, type } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'policy.deleted', 'Policy', undefined, { type })
    return NextResponse.json({ ok: true })
  })
}
