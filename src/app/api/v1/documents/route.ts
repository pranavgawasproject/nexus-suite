import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { z } from 'zod'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Documents (Module 7 Collaboration & Docs).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('collab').
 */

const createDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(200000).optional().default(''),
  parentId: z.string().optional().nullable(),
  isPublic: z.boolean().optional().default(false),
})

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

// GET /api/v1/documents?parentId=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'collab')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const parentId = searchParams.get('parentId') // 'root' for top-level, omit for all
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const documents = await db.document.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(parentId === 'root'
        ? { parentId: null }
        : parentId
          ? { parentId }
          : {}),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      parentId: true,
      version: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { children: true } },
    },
    orderBy: { title: 'asc' },
    take: limit,
  })

  return apiOk({
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      slug: d.slug,
      parentId: d.parentId,
      version: d.version,
      isPublic: d.isPublic,
      childCount: d._count.children,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    })),
  })
}

// POST /api/v1/documents — create document (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'collab', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createDocumentSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  if (data.parentId) {
    const parent = await db.document.findFirst({
      where: { id: data.parentId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!parent) {
      return apiError('parentId not found in your organization', 'not_found', 404)
    }
  }

  let slug = slugify(data.title)
  let suffix = 0
  while (
    await db.document.findUnique({
      where: { orgId_slug: { orgId: g.ctx!.orgId, slug } },
    })
  ) {
    suffix++
    slug = `${slugify(data.title)}-${suffix}`
  }

  const document = await db.document.create({
    data: {
      orgId: g.ctx!.orgId,
      title: data.title,
      slug,
      content: data.content ?? '',
      parentId: data.parentId || null,
      isPublic: data.isPublic ?? false,
      version: 1,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      parentId: true,
      version: true,
      isPublic: true,
      content: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await db.documentVersion.create({
    data: {
      documentId: document.id,
      version: 1,
      content: data.content ?? '',
      changeSummary: 'Initial version',
    },
  })

  await emitEvent(g.ctx!.orgId, 'document.created', {
    document: {
      id: document.id,
      title: document.title,
      slug: document.slug,
      version: document.version,
    },
  })

  return apiOk({ document }, 201)
}
