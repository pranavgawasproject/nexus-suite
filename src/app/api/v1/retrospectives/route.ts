import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createPublicRetrospectiveSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Sprint retrospectives (Module 1 Tasks).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('tasks').
 */

// GET /api/v1/retrospectives?cycleId=&status=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const cycleId = searchParams.get('cycleId')
  const status = searchParams.get('status')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const retrospectives = await db.retrospective.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(cycleId ? { cycleId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    },
    select: {
      id: true,
      cycleId: true,
      title: true,
      wentWell: true,
      toImprove: true,
      actionItems: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      cycle: { select: { id: true, name: true, status: true, projectId: true } },
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
  })

  return apiOk({ retrospectives })
}

// POST /api/v1/retrospectives — create retrospective (write scope)
// Body: { cycleId, title, wentWell?, toImprove?, actionItems?, status?, authorId? }
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createPublicRetrospectiveSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const cycle = await db.cycle.findFirst({
    where: { id: data.cycleId, orgId: g.ctx!.orgId },
    select: { id: true, name: true },
  })
  if (!cycle) {
    return apiError('Cycle not found in your org', 'not_found', 404)
  }

  let authorId: string | null = data.authorId ?? null
  if (authorId) {
    const author = await db.user.findFirst({
      where: { id: authorId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!author) {
      return apiError('Author user not found in your org', 'not_found', 404)
    }
  }

  const retrospective = await db.retrospective.create({
    data: {
      orgId: g.ctx!.orgId,
      cycleId: data.cycleId,
      title: data.title,
      wentWell: data.wentWell ?? null,
      toImprove: data.toImprove ?? null,
      actionItems: data.actionItems ?? null,
      status: data.status ?? 'draft',
      authorId,
    },
    select: {
      id: true,
      cycleId: true,
      title: true,
      wentWell: true,
      toImprove: true,
      actionItems: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      cycle: { select: { id: true, name: true, status: true, projectId: true } },
      author: { select: { id: true, name: true, email: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'retrospective.created', {
    retrospective: {
      id: retrospective.id,
      cycleId: retrospective.cycleId,
      title: retrospective.title,
      status: retrospective.status,
      author: retrospective.author,
    },
  })

  return apiOk({ retrospective }, 201)
}
