import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createKraSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — KRAs (Module 2 KRA/KPA).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('kra').
 */

// GET /api/v1/kras?userId=&cycle=&status=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'kra')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const cycle = searchParams.get('cycle')
  const status = searchParams.get('status')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const kras = await db.kra.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(userId && userId !== 'all' ? { userId } : {}),
      ...(cycle && cycle !== 'all' ? { cycle } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      cycle: true,
      weight: true,
      targetRating: true,
      selfRating: true,
      managerRating: true,
      selfComment: true,
      managerComment: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true, designation: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return apiOk({ kras })
}

// POST /api/v1/kras — create KRA (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'kra', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createKraSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const user = await db.user.findFirst({
    where: { id: data.userId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!user) {
    return apiError('userId not found in your organization', 'not_found', 404)
  }

  const kra = await db.kra.create({
    data: {
      orgId: g.ctx!.orgId,
      userId: data.userId,
      title: data.title,
      description: data.description || null,
      cycle: data.cycle,
      weight: data.weight,
      targetRating: data.targetRating,
      status: 'draft',
    },
    select: {
      id: true,
      title: true,
      description: true,
      cycle: true,
      weight: true,
      targetRating: true,
      status: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, designation: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'kra.created', {
    kra: {
      id: kra.id,
      title: kra.title,
      cycle: kra.cycle,
      status: kra.status,
      userId: data.userId,
    },
  })

  return apiOk({ kra }, 201)
}
