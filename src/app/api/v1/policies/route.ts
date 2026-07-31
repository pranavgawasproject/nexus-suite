import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { upsertPolicySchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Policies (Module 10 Governance & Compliance).
 * GET list (read), POST upsert (write). Module-gated via requirePublicApi('governance').
 */

// GET /api/v1/policies?type=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'governance')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const policies = await db.policy.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(type ? { type } : {}),
    },
    select: {
      id: true,
      type: true,
      name: true,
      config: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { type: 'asc' },
    take: limit,
  })

  return apiOk({
    policies: policies.map((p) => ({
      ...p,
      config: JSON.parse(p.config),
    })),
  })
}

// POST /api/v1/policies — upsert policy by type (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'governance', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, upsertPolicySchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const configStr = JSON.stringify(data.config)
  const existing = await db.policy.findUnique({
    where: {
      orgId_type: {
        orgId: g.ctx!.orgId,
        type: data.type,
      },
    },
  })

  let policy
  let eventName: 'policy.created' | 'policy.updated'

  if (existing) {
    policy = await db.policy.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        config: configStr,
        active: data.active ?? true,
      },
      select: {
        id: true,
        type: true,
        name: true,
        config: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    eventName = 'policy.updated'
  } else {
    policy = await db.policy.create({
      data: {
        orgId: g.ctx!.orgId,
        type: data.type,
        name: data.name,
        config: configStr,
        active: data.active ?? true,
      },
      select: {
        id: true,
        type: true,
        name: true,
        config: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    eventName = 'policy.created'
  }

  const payload = {
    id: policy.id,
    type: policy.type,
    name: policy.name,
    config: JSON.parse(policy.config),
    active: policy.active,
  }

  await emitEvent(g.ctx!.orgId, eventName, { policy: payload })

  return apiOk({ policy: { ...payload, createdAt: policy.createdAt, updatedAt: policy.updatedAt } }, existing ? 200 : 201)
}
