import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createBudgetSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Budgets (Module 5 Budget & Financial).
 * GET list (read), POST upsert (write). Module-gated via requirePublicApi('budget').
 * One budget per project (POST upserts).
 */

// GET /api/v1/budgets?projectId=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'budget')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const budgets = await db.budget.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
    },
    select: {
      id: true,
      totalAmount: true,
      currency: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return apiOk({ budgets })
}

// POST /api/v1/budgets — create or update budget for a project (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'budget', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createBudgetSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const project = await db.project.findFirst({
    where: { id: data.projectId, orgId: g.ctx!.orgId },
    select: { id: true },
  })
  if (!project) {
    return apiError('projectId not found in your organization', 'not_found', 404)
  }

  const existing = await db.budget.findFirst({
    where: { orgId: g.ctx!.orgId, projectId: data.projectId },
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
      select: {
        id: true,
        totalAmount: true,
        currency: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { id: true, name: true, color: true } },
      },
    })
  } else {
    budget = await db.budget.create({
      data: {
        orgId: g.ctx!.orgId,
        projectId: data.projectId,
        totalAmount: data.totalAmount,
        currency: data.currency,
        notes: data.notes || null,
      },
      select: {
        id: true,
        totalAmount: true,
        currency: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { id: true, name: true, color: true } },
      },
    })
  }

  await emitEvent(g.ctx!.orgId, 'budget.upserted', {
    budget: {
      id: budget.id,
      projectId: budget.project.id,
      totalAmount: budget.totalAmount,
      currency: budget.currency,
    },
  })

  return apiOk({ budget }, existing ? 200 : 201)
}
