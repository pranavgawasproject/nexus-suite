import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { withErrors } from '@/lib/api-guard'
import { generateDashboardInsights } from '@/lib/ai'

/**
 * POST /api/ai/dashboard-insights
 * Generates AI-powered insights from the cross-module dashboard data.
 * Falls back to heuristic-only insights if AI is not configured.
 */
export async function POST() {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    // Reuse dashboard aggregation logic
    const modules = await db.orgModule.findMany({ where: { orgId: ctx.org.id } })
    const enabled = new Set(
      modules.filter((m) => m.state === 'active' || m.state === 'trial').map((m) => m.moduleKey)
    )

    const [users] = await Promise.all([
      db.user.findMany({ where: { orgId: ctx.org.id } }),
    ])

    let tasks: any[] = []
    let projects: any[] = []
    if (enabled.has('tasks')) {
      ;[tasks, projects] = await Promise.all([
        db.task.findMany({ where: { orgId: ctx.org.id }, include: { assignee: true, project: true } }),
        db.project.findMany({ where: { orgId: ctx.org.id } }),
      ])
    }

    const statusCounts: Record<string, number> = {}
    const priorityCounts: Record<string, number> = {}
    for (const t of tasks) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1
    }

    const workload = users.map((u) => ({
      name: u.name,
      open: tasks.filter((t: any) => t.assigneeId === u.id && t.status !== 'done').length,
      done: tasks.filter((t: any) => t.assigneeId === u.id && t.status === 'done').length,
    }))

    let kpis: any = {
      totalTasks: tasks.length,
      openTasks: tasks.filter((t: any) => t.status !== 'done').length,
      blockedTasks: tasks.filter((t: any) => t.status === 'blocked').length,
      completionRate: tasks.length ? Math.round((statusCounts['done'] || 0) / tasks.length * 100) : 0,
      activeProjects: projects.filter((p: any) => p.status === 'active').length,
      teamSize: users.length,
    }

    // Add module-specific KPIs if enabled
    if (enabled.has('leave')) {
      const pendingLeaves = await db.leave.count({ where: { orgId: ctx.org.id, status: 'pending' } })
      kpis.pendingLeaves = pendingLeaves
    }
    if (enabled.has('resource')) {
      const allocations = await db.allocation.findMany({ where: { orgId: ctx.org.id, endDate: null } })
      const overAllocated = new Set(
        allocations
          .reduce((acc, a) => {
            const existing = acc.find((x) => x.userId === a.userId)
            if (existing) existing.total += a.allocationPct
            else acc.push({ userId: a.userId, total: a.allocationPct })
            return acc
          }, [] as { userId: string; total: number }[])
          .filter((x) => x.total >= 100)
          .map((x) => x.userId)
      ).size
      kpis.overAllocated = overAllocated
    }
    if (enabled.has('kra')) {
      kpis.krasPendingReview = await db.kra.count({ where: { orgId: ctx.org.id, status: 'manager_review' } })
    }
    if (enabled.has('budget')) {
      const [budgets, expenses] = await Promise.all([
        db.budget.findMany({ where: { orgId: ctx.org.id } }),
        db.expense.findMany({ where: { orgId: ctx.org.id } }),
      ])
      kpis.totalBudget = budgets.reduce((s, b) => s + b.totalAmount, 0)
      kpis.totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
    }

    const result = await generateDashboardInsights({
      kpis,
      statusCounts,
      priorityCounts,
      workload,
      bookingsPerRoom: [],
    })

    return NextResponse.json(result)
  })
}
