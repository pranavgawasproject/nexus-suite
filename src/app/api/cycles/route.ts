import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { createCycleSchema, updateCycleSchema, cycleQuerySchema } from '@/lib/schemas'

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
        _count: { select: { tasks: true } },
      },
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
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

    if (data.projectId) {
      const project = await db.project.findFirst({
        where: { id: data.projectId, orgId: g.ctx!.org.id },
      })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    const cycle = await db.cycle.create({
      data: {
        orgId: g.ctx!.org.id,
        name: data.name,
        description: data.description || null,
        projectId: data.projectId || null,
        status: data.status,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        goal: data.goal || null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
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

    const existing = await db.cycle.findFirst({
      where: { id: data.id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    if (data.projectId) {
      const project = await db.project.findFirst({
        where: { id: data.projectId, orgId: g.ctx!.org.id },
      })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    const cycle = await db.cycle.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.projectId !== undefined && { projectId: data.projectId || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.endDate !== undefined && {
          endDate: data.endDate ? new Date(data.endDate) : null,
        }),
        ...(data.goal !== undefined && { goal: data.goal }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'cycle.updated', 'Cycle', cycle.id, {
      name: cycle.name,
      status: cycle.status,
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
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await db.cycle.findFirst({
      where: { id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    // Detach tasks first (cycleId SetNull on delete also works, but explicit is clearer)
    await db.task.updateMany({
      where: { cycleId: id, orgId: g.ctx!.org.id },
      data: { cycleId: null },
    })
    await db.cycle.delete({ where: { id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'cycle.deleted', 'Cycle', id, {
      name: existing.name,
    })
    return NextResponse.json({ ok: true })
  })
}
