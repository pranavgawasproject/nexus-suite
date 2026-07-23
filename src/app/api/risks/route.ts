import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createRiskSchema, updateRiskSchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const category = searchParams.get('category')

    const risks = await db.risk.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
        ...(status && status !== 'all' ? { status } : {}),
        ...(category && category !== 'all' ? { category } : {}),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { severity: 'desc' },
    })
    return NextResponse.json({ risks })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createRiskSchema)
    if (error) return error

    const severity = data.likelihood * data.impact
    const risk = await db.risk.create({
      data: {
        orgId: g.ctx!.org.id,
        projectId: data.projectId || null,
        title: data.title,
        description: data.description || null,
        category: data.category,
        likelihood: data.likelihood,
        impact: data.impact,
        severity,
        status: data.status,
        ownerId: data.ownerId || null,
        mitigation: data.mitigation || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'risk.created', 'Risk', risk.id, {
      title: risk.title, severity: risk.severity,
    })
    return NextResponse.json({ risk })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateRiskSchema)
    if (error) return error

    // Recompute severity if likelihood or impact changed
    let severity: number | undefined
    if (data.likelihood !== undefined || data.impact !== undefined) {
      const existing = await db.risk.findUnique({ where: { id: data.id, orgId: g.ctx!.org.id } })
      if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
      const l = data.likelihood ?? existing.likelihood
      const i = data.impact ?? existing.impact
      severity = l * i
    }

    const risk = await db.risk.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.likelihood !== undefined && { likelihood: data.likelihood }),
        ...(data.impact !== undefined && { impact: data.impact }),
        ...(severity !== undefined && { severity }),
        ...(data.status !== undefined && {
          status: data.status,
          closedAt: data.status === 'closed' || data.status === 'accepted' ? new Date() : null,
        }),
        ...(data.ownerId !== undefined && { ownerId: data.ownerId || null }),
        ...(data.mitigation !== undefined && { mitigation: data.mitigation }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    return NextResponse.json({ risk })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
    await db.risk.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'risk.deleted', 'Risk', id)
    return NextResponse.json({ ok: true })
  })
}
