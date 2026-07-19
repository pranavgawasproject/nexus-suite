import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createExpenseSchema, updateExpenseSchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('budget')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const category = searchParams.get('category')

    const expenses = await db.expense.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
        ...(category && category !== 'all' ? { category } : {}),
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        incurredBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { incurredDate: 'desc' },
    })
    return NextResponse.json({ expenses })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('budget')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createExpenseSchema)
    if (error) return error

    const expense = await db.expense.create({
      data: {
        orgId: g.ctx!.org.id,
        projectId: data.projectId,
        incurredById: g.ctx!.user!.id,
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        category: data.category,
        incurredDate: new Date(data.incurredDate),
        vendor: data.vendor || null,
        notes: data.notes || null,
      },
      include: {
        project: { select: { id: true, name: true, color: true } },
        incurredBy: { select: { id: true, name: true, email: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'expense.created', 'Expense', expense.id, {
      projectId: expense.projectId,
      amount: expense.amount,
      currency: expense.currency,
    })
    return NextResponse.json({ expense })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('budget')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateExpenseSchema)
    if (error) return error

    const expense = await db.expense.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
    })
    return NextResponse.json({ expense })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('budget')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
    await db.expense.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'expense.deleted', 'Expense', id)
    return NextResponse.json({ ok: true })
  })
}
