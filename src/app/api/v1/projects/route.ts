import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createProjectSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'
import { z } from 'zod'

const publicCreateProjectSchema = createProjectSchema.extend({
  createdById: z.string().min(1, 'createdById is required'),
})

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

// POST /api/v1/projects — create a project (write scope).
// Requires createdById (must belong to the org).
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, publicCreateProjectSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const user = await db.user.findFirst({
    where: { id: data.createdById, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!user) {
    return apiError('createdById not found in your organization', 'not_found', 404)
  }

  const project = await db.project.create({
    data: {
      orgId: g.ctx!.orgId,
      name: data.name,
      description: data.description || null,
      color: data.color,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      createdById: data.createdById,
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
      createdBy: { select: { id: true, name: true, email: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'project.created', {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
    },
  })

  return apiOk({ project }, 201)
}
