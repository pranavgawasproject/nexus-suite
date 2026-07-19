import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { z } from 'zod'

const createDocSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().max(200000).optional().default(''),
  parentId: z.string().optional().nullable(),
  isPublic: z.boolean().optional().default(false),
})

const updateDocSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(200000).optional(),
  parentId: z.string().optional().nullable(),
  isPublic: z.boolean().optional(),
  changeSummary: z.string().max(200).optional(),
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

// GET /api/documents — list docs (optionally by parent)
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('collab')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const parentId = searchParams.get('parentId') // 'root' for top-level

    const docs = await db.document.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(parentId === 'root'
          ? { parentId: null }
          : parentId
          ? { parentId }
          : {}),
      },
      include: {
        _count: { select: { children: true } },
      },
      orderBy: { title: 'asc' },
    })

    return NextResponse.json({
      documents: docs.map((d) => ({
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
  })
}

// POST /api/documents — create a new doc
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('collab')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createDocSchema)
    if (error) return error

    let slug = slugify(data.title)
    // Ensure slug uniqueness within org
    let suffix = 0
    while (await db.document.findUnique({ where: { orgId_slug: { orgId: g.ctx!.org.id, slug } } })) {
      suffix++
      slug = `${slugify(data.title)}-${suffix}`
    }

    const doc = await db.document.create({
      data: {
        orgId: g.ctx!.org.id,
        title: data.title,
        slug,
        content: data.content,
        parentId: data.parentId || null,
        isPublic: data.isPublic,
        createdById: g.ctx!.user?.id,
        updatedById: g.ctx!.user?.id,
        version: 1,
      },
      include: {
        versions: { take: 1, orderBy: { version: 'desc' } },
      },
    })

    // Create initial version snapshot
    await db.documentVersion.create({
      data: {
        documentId: doc.id,
        version: 1,
        content: data.content,
        editedById: g.ctx!.user?.id,
        changeSummary: 'Initial version',
      },
    })

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'document.created', 'Document', doc.id, { title: doc.title })
    return NextResponse.json({ document: doc })
  })
}

// PATCH /api/documents — update a doc (creates a new version snapshot)
export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('collab')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateDocSchema)
    if (error) return error

    const existing = await db.document.findUnique({ where: { id: data.id, orgId: g.ctx!.org.id } })
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const newVersion = data.content !== undefined && data.content !== existing.content
      ? existing.version + 1
      : existing.version

    const doc = await db.document.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title, slug: slugify(data.title) }),
        ...(data.content !== undefined && { content: data.content, version: newVersion }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
        ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
        updatedById: g.ctx!.user?.id,
      },
    })

    // Snapshot version if content changed
    if (newVersion > existing.version) {
      await db.documentVersion.create({
        data: {
          documentId: doc.id,
          version: newVersion,
          content: data.content!,
          editedById: g.ctx!.user?.id,
          changeSummary: data.changeSummary || `Version ${newVersion}`,
        },
      })
    }

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'document.updated', 'Document', doc.id, {
      title: doc.title,
      version: doc.version,
    })
    return NextResponse.json({ document: doc })
  })
}

// GET /api/documents/versions?id=... — list versions for a doc
export async function getVersions(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('collab')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    const versions = await db.documentVersion.findMany({
      where: { documentId: id, document: { orgId: g.ctx!.org.id } },
      orderBy: { version: 'desc' },
      take: 50,
    })

    return NextResponse.json({ versions })
  })
}

// DELETE /api/documents?id=...
export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('collab')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    await db.document.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'document.deleted', 'Document', id)
    return NextResponse.json({ ok: true })
  })
}
