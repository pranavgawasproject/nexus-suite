import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { createCycleSchema, updateCycleSchema, cycleQuerySchema } from '@/lib/schemas'

// Cycles / Sprints — iteration management on top of Tasks & Projects (PRD competitor-inspired feature).
// Gated by the tasks module since cycles are a view/extension of project work.

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, cycleQuerySchema)
    if (error) return error

    const cycles = await db.cycle.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(data.projectId && data.projectId !== 'all' ? { projectId: data.projectId } : {}),
        ...(data.status && data.status !== 'all' ? { status: data.status } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { startDate: 'desc' },
    })
    return NextResponse.json({ cycles })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createCycleSchema)
    if (error) return error

    // Optional: verify project belongs to org if provided
    if (data.projectId) {
      const project = await db.project.findFirst({
        where: { id: data.projectId, orgId: g.ctx!.org.id },
      })
      if (!project) {
        return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
      }
    }

    const cycle = await db.cycle.create({
      data: {
        orgId: g.ctx!.org.id,
        projectId: data.projectId || null,
        name: data.name,
        description: data.description || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'cycle.created', 'Cycle', cycle.id, {
      name: cycle.name,
      projectId: cycle.projectId,
    })
    return NextResponse.json({ cycle })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateCycleSchema)
    if (error) return error

    if (data.projectId) {
      const project = await db.project.findFirst({
        where: { id: data.projectId, orgId: g.ctx!.org.id },
      })
      if (!project) {
        return NextResponse.json({ error: 'project_not_found' }, { status: 404 })
      }
    }

    const cycle = await db.cycle.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.projectId !== undefined && { projectId: data.projectId || null }),
        ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { endDate: new Date(data.endDate) }),
        ...(data.status !== undefined && { status: data.status }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'cycle.updated', 'Cycle', cycle.id, {
      name: cycle.name,
    })
    return NextResponse.json({ cycle })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    await db.cycle.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'cycle.deleted', 'Cycle', id)
    return NextResponse.json({ ok: true })
  })
}
