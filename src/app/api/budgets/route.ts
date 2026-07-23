import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createBudgetSchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('budget')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')

    const budgets = await db.budget.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ budgets })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('budget')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createBudgetSchema)
    if (error) return error

    // Upsert: one budget per project (replace if exists)
    const existing = await db.budget.findFirst({
      where: { orgId: g.ctx!.org.id, projectId: data.projectId },
    })
    let budget
    if (existing) {
      budget = await db.budget.update({
        where: { id: existing.id },
        data: {
          totalAmount: data.totalAmount,
          currency: data.currency,
          notes: data.notes || null,
        },
        include: { project: { select: { id: true, name: true, color: true } } },
      })
    } else {
      budget = await db.budget.create({
        data: {
          orgId: g.ctx!.org.id,
          projectId: data.projectId,
          totalAmount: data.totalAmount,
          currency: data.currency,
          notes: data.notes || null,
        },
        include: { project: { select: { id: true, name: true, color: true } } },
      })
    }
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'budget.upserted', 'Budget', budget.id, {
      projectId: budget.projectId,
      totalAmount: budget.totalAmount,
      currency: budget.currency,
    })
    return NextResponse.json({ budget })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('budget')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
    await db.budget.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'budget.deleted', 'Budget', id)
    return NextResponse.json({ ok: true })
  })
}
