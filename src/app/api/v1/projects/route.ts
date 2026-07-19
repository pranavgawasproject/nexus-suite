import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, apiOk } from '@/lib/public-api'

// GET /api/v1/projects — list projects in the authenticated org.
// Optional query: ?status=active
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const projects = await db.project.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      status: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return apiOk({ projects })
}
