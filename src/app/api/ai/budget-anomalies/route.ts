import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { withErrors } from '@/lib/api-guard'
import { detectBudgetAnomalies } from '@/lib/ai'

export async function POST() {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const [expenses, budgets] = await Promise.all([
      db.expense.findMany({ where: { orgId: ctx.org.id } }),
      db.budget.findMany({ where: { orgId: ctx.org.id } }),
    ])

    const totalBudget = budgets.reduce((s, b) => s + b.totalAmount, 0)
    const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)

    const anomalies = await detectBudgetAnomalies(
      expenses.map((e) => ({
        title: e.title,
        amount: e.amount,
        category: e.category,
        incurredDate: e.incurredDate.toISOString(),
        vendor: e.vendor,
      })),
      totalBudget,
      totalSpent
    )

    return NextResponse.json({ anomalies })
  })
}
