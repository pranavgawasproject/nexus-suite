import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, apiOk } from '@/lib/public-api'

// GET /api/v1/me — return the org + scopes for the current API key.
// Useful for clients to verify a key works before doing real work.
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const org = await db.organization.findUnique({
    where: { id: g.ctx!.orgId },
    select: { id: true, name: true, slug: true, plan: true, currency: true, timezone: true },
  })
  const modules = await db.orgModule.findMany({
    where: { orgId: g.ctx!.orgId, state: { in: ['active', 'trial'] } },
    select: { moduleKey: true, state: true },
  })

  return apiOk({
    org,
    apiKey: { scopes: g.ctx!.scopes },
    enabled_modules: modules.map((m) => m.moduleKey),
  })
}
