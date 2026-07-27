import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import {
  createRetrospectiveSchema,
  updateRetrospectiveSchema,
  retrospectiveQuerySchema,
} from '@/lib/schemas'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, retrospectiveQuerySchema)
    if (error) return error

    const retros = await db.retrospective.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(data.cycleId ? { cycleId: data.cycleId } : {}),
        ...(data.status && data.status !== 'all' ? { status: data.status } : {}),
      },
      include: {
        cycle: { select: { id: true, name: true, status: true, projectId: true } },
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
    })
    return NextResponse.json({ retrospectives: retros })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createRetrospectiveSchema)
    if (error) return error

    const cycle = await db.cycle.findFirst({
      where: { id: data.cycleId, orgId: g.ctx!.org.id },
    })
    if (!cycle) {
      return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
    }

    const retro = await db.retrospective.create({
      data: {
        orgId: g.ctx!.org.id,
        cycleId: data.cycleId,
        title: data.title,
        wentWell: data.wentWell || null,
        toImprove: data.toImprove || null,
        actionItems: data.actionItems || null,
        status: data.status ?? 'draft',
        authorId: g.ctx!.user?.id || null,
      },
      include: {
        cycle: { select: { id: true, name: true, status: true, projectId: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'retrospective.created', 'Retrospective', retro.id, {
      title: retro.title,
      cycleId: retro.cycleId,
    })
    return NextResponse.json({ retrospective: retro })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateRetrospectiveSchema)
    if (error) return error

    const existing = await db.retrospective.findFirst({
      where: { id: data.id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Retrospective not found' }, { status: 404 })
    }

    if (data.cycleId) {
      const cycle = await db.cycle.findFirst({
        where: { id: data.cycleId, orgId: g.ctx!.org.id },
      })
      if (!cycle) {
        return NextResponse.json({ error: 'Cycle not found' }, { status: 404 })
      }
    }

    const retro = await db.retrospective.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.wentWell !== undefined && { wentWell: data.wentWell }),
        ...(data.toImprove !== undefined && { toImprove: data.toImprove }),
        ...(data.actionItems !== undefined && { actionItems: data.actionItems }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.cycleId !== undefined && { cycleId: data.cycleId }),
      },
      include: {
        cycle: { select: { id: true, name: true, status: true, projectId: true } },
        author: { select: { id: true, name: true, email: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'retrospective.updated', 'Retrospective', retro.id, {
      title: retro.title,
      status: retro.status,
    })
    return NextResponse.json({ retrospective: retro })
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

    const existing = await db.retrospective.findFirst({
      where: { id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Retrospective not found' }, { status: 404 })
    }

    await db.retrospective.delete({ where: { id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'retrospective.deleted', 'Retrospective', id, {
      title: existing.title,
      cycleId: existing.cycleId,
    })
    return NextResponse.json({ ok: true })
  })
}
