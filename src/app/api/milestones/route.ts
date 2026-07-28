import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { createMilestoneSchema, updateMilestoneSchema, milestoneQuerySchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, milestoneQuerySchema)
    if (error) return error

    const milestones = await db.milestone.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(data.projectId && data.projectId !== 'all' ? { projectId: data.projectId } : {}),
        ...(data.status && data.status !== 'all' ? { status: data.status } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ milestones })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createMilestoneSchema)
    if (error) return error

    const project = await db.project.findFirst({
      where: { id: data.projectId, orgId: g.ctx!.org.id },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const milestone = await db.milestone.create({
      data: {
        orgId: g.ctx!.org.id,
        projectId: data.projectId,
        name: data.name,
        description: data.description || null,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'milestone.created', 'Milestone', milestone.id, {
      name: milestone.name,
      projectId: milestone.projectId,
    })
    return NextResponse.json({ milestone })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateMilestoneSchema)
    if (error) return error

    const existing = await db.milestone.findFirst({
      where: { id: data.id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    if (data.projectId) {
      const project = await db.project.findFirst({
        where: { id: data.projectId, orgId: g.ctx!.org.id },
      })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    const milestone = await db.milestone.update({
      where: { id: data.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
        ...(data.projectId !== undefined && { projectId: data.projectId }),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        _count: { select: { tasks: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'milestone.updated', 'Milestone', milestone.id, {
      name: milestone.name,
      status: milestone.status,
    })
    return NextResponse.json({ milestone })
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

    const existing = await db.milestone.findFirst({
      where: { id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    await db.task.updateMany({
      where: { milestoneId: id, orgId: g.ctx!.org.id },
      data: { milestoneId: null },
    })
    await db.milestone.delete({ where: { id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'milestone.deleted', 'Milestone', id, {
      name: existing.name,
    })
    return NextResponse.json({ ok: true })
  })
}
