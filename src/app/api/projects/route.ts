import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createProjectSchema, updateProjectSchema, idQuerySchema } from '@/lib/schemas'

export async function GET() {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const projects = await db.project.findMany({
      where: { orgId: g.ctx!.org.id },
      include: {
        _count: { select: { tasks: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ projects })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createProjectSchema)
    if (error) return error

    const project = await db.project.create({
      data: {
        orgId: g.ctx!.org.id,
        name: data.name,
        description: data.description || null,
        color: data.color,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        createdById: g.ctx!.user!.id,
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'project.created', 'Project', project.id, { name: project.name })
    return NextResponse.json({ project })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateProjectSchema)
    if (error) return error

    const project = await db.project.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.status !== undefined && { status: data.status }),
      },
    })
    return NextResponse.json({ project })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const parsed = idQuerySchema.safeParse({ id })
    if (!parsed.success) {
      return NextResponse.json({ error: 'no_id' }, { status: 400 })
    }
    await db.project.delete({ where: { id: parsed.data.id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'project.deleted', 'Project', parsed.data.id)
    return NextResponse.json({ ok: true })
  })
}

// Suppress unused import warning
void getDemoContext
