import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createExpenseSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Expenses (Module 5 Budget & Financial).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('budget').
 * Body requires incurredById (org user) since there is no session user on public API.
 */

const publicCreateExpenseSchema = createExpenseSchema.extend({
  incurredById: z.string().min(1),
})

// GET /api/v1/expenses?projectId=&category=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'budget')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const category = searchParams.get('category')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const expenses = await db.expense.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(category && category !== 'all' ? { category } : {}),
    },
    select: {
      id: true,
      title: true,
      amount: true,
      currency: true,
      category: true,
      incurredDate: true,
      vendor: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
      incurredBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { incurredDate: 'desc' },
    take: limit,
  })

  return apiOk({ expenses })
}

// POST /api/v1/expenses — create expense (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'budget', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, publicCreateExpenseSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const project = await db.project.findFirst({
    where: { id: data.projectId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!project) {
    return apiError('projectId not found in your organization', 'not_found', 404)
  }

  const user = await db.user.findFirst({
    where: { id: data.incurredById, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!user) {
    return apiError('incurredById not found in your organization', 'not_found', 404)
  }

  const expense = await db.expense.create({
    data: {
      orgId: g.ctx!.orgId,
      projectId: data.projectId,
      incurredById: data.incurredById,
      title: data.title,
      amount: data.amount,
      currency: data.currency,
      category: data.category,
      incurredDate: new Date(data.incurredDate),
      vendor: data.vendor || null,
      notes: data.notes || null,
    },
    select: {
      id: true,
      title: true,
      amount: true,
      currency: true,
      category: true,
      incurredDate: true,
      vendor: true,
      notes: true,
      createdAt: true,
      project: { select: { id: true, name: true, color: true } },
      incurredBy: { select: { id: true, name: true, email: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'expense.created', {
    expense: {
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      currency: expense.currency,
      projectId: expense.project.id,
      incurredById: expense.incurredBy.id,
    },
  })

  return apiOk({ expense }, 201)
}
