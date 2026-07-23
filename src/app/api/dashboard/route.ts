import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { withErrors } from '@/lib/api-guard'

// Cross-module dashboard data — gracefully skips disabled modules.
export async function GET() {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const modules = await db.orgModule.findMany({ where: { orgId: ctx.org.id } })
    const enabled = new Set(
      modules.filter((m) => m.state === 'active' || m.state === 'trial').map((m) => m.moduleKey)
    )

    const [users, moduleRows] = await Promise.all([
      db.user.findMany({ where: { orgId: ctx.org.id } }),
      db.orgModule.findMany({ where: { orgId: ctx.org.id } }),
    ])

    let tasks: Awaited<ReturnType<typeof db.task.findMany>> = []
    let projects: Awaited<ReturnType<typeof db.project.findMany>> = []
    if (enabled.has('tasks')) {
      [tasks, projects] = await Promise.all([
        db.task.findMany({
          where: { orgId: ctx.org.id },
          include: { assignee: true, project: true },
        }),
        db.project.findMany({ where: { orgId: ctx.org.id } }),
      ])
    }

    let rooms: Awaited<ReturnType<typeof db.room.findMany>> = []
    let bookings: Awaited<ReturnType<typeof db.booking.findMany>> = []
    if (enabled.has('rooms')) {
      [rooms, bookings] = await Promise.all([
        db.room.findMany({ where: { orgId: ctx.org.id } }),
        db.booking.findMany({ where: { orgId: ctx.org.id }, include: { room: true } }),
      ])
    }

     
    let leaves: any[] = []
     
    let attendanceToday: any[] = []
    if (enabled.has('leave')) {
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      ;[leaves, attendanceToday] = await Promise.all([
        db.leave.findMany({
          where: { orgId: ctx.org.id, status: { in: ['pending', 'approved'] } },
          include: { user: { select: { id: true, name: true } } },
        }),
        db.attendance.findMany({
          where: { orgId: ctx.org.id, date: today },
          include: { user: { select: { id: true, name: true } } },
        }),
      ])
    }

    let allocations: Awaited<ReturnType<typeof db.allocation.findMany>> = []
    if (enabled.has('resource')) {
      allocations = await db.allocation.findMany({
        where: { orgId: ctx.org.id, endDate: null },
        include: { user: { select: { id: true, name: true } }, project: { select: { id: true, name: true, color: true } } },
      })
    }

    let kras: Awaited<ReturnType<typeof db.kra.findMany>> = []
    if (enabled.has('kra')) {
      kras = await db.kra.findMany({
        where: { orgId: ctx.org.id },
        include: { user: { select: { id: true, name: true } } },
      })
    }

     
    let expenses: any[] = []
     
    let budgets: any[] = []
    if (enabled.has('budget')) {
      ;[expenses, budgets] = await Promise.all([
        db.expense.findMany({ where: { orgId: ctx.org.id } }),
        db.budget.findMany({ where: { orgId: ctx.org.id }, include: { project: true } }),
      ])
    }

    // Task aggregates
    const statusCounts: Record<string, number> = {}
    const priorityCounts: Record<string, number> = {}
    for (const t of tasks) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1
    }

    const tasksPerProject = projects.map((p) => ({
      name: p.name,
      color: p.color,
      count: tasks.filter((t) => t.projectId === p.id).length,
      done: tasks.filter((t) => t.projectId === p.id && t.status === 'done').length,
    }))

    const workload = users.map((u) => ({
      name: u.name,
      open: tasks.filter((t) => t.assigneeId === u.id && t.status !== 'done').length,
      done: tasks.filter((t) => t.assigneeId === u.id && t.status === 'done').length,
    }))

    // Room utilisation
    const now = new Date()
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() + 7)
    const upcomingBookings = bookings.filter((b) => b.startTime >= now && b.startTime <= weekEnd)
    const bookingsPerRoom = rooms.map((r) => ({
      name: r.name,
      count: upcomingBookings.filter((b) => b.roomId === r.id).length,
    }))

    // Leave aggregates
    const pendingLeaves = leaves.filter((l) => l.status === 'pending').length
    const onLeaveToday = leaves.filter((l) => {
      const start = new Date(l.startDate)
      const end = new Date(l.endDate)
      return start <= now && end >= now && l.status === 'approved'
    }).length
    const checkedInToday = attendanceToday.filter((a) => a.checkIn).length

    // Resource utilisation — sum of allocationPct per user, capped at 100
    const resourceUtilisation = users.map((u) => {
      const userAllocs = allocations.filter((a) => a.userId === u.id)
      const totalPct = Math.min(100, userAllocs.reduce((sum, a) => sum + a.allocationPct, 0))
      return {
        name: u.name,
        allocation: totalPct,
        projects: userAllocs.length,
      }
    })

    // KRA aggregates
    const kraByStatus = kras.reduce((acc, k) => {
      acc[k.status] = (acc[k.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Budget aggregates
    const budgetByProject = budgets.map((b) => {
      const spent = expenses
        .filter((e) => e.projectId === b.projectId)
        .reduce((sum, e) => sum + e.amount, 0)
      return {
        name: b.project?.name || 'Unknown',
        budget: b.totalAmount,
        spent,
        remaining: b.totalAmount - spent,
        pct: b.totalAmount ? Math.round((spent / b.totalAmount) * 100) : 0,
        currency: b.currency,
      }
    })

    const activeModules = moduleRows.filter((m) => m.state === 'active' || m.state === 'trial').length

    const kpis = {
      totalTasks: tasks.length,
      openTasks: tasks.filter((t) => t.status !== 'done').length,
      blockedTasks: tasks.filter((t) => t.status === 'blocked').length,
      completionRate: tasks.length ? Math.round((statusCounts['done'] || 0) / tasks.length * 100) : 0,
      activeProjects: projects.filter((p) => p.status === 'active').length,
      totalRooms: rooms.length,
      upcomingBookings: upcomingBookings.length,
      teamSize: users.length,
      activeModules,
      totalModules: moduleRows.length,
      // Module 8
      pendingLeaves,
      onLeaveToday,
      checkedInToday,
      // Module 4
      overAllocated: resourceUtilisation.filter((u) => u.allocation >= 100).length,
      // Module 2
      krasTotal: kras.length,
      krasPendingReview: kras.filter((k) => k.status === 'manager_review').length,
      // Module 5
      totalBudget: budgets.reduce((s, b) => s + b.totalAmount, 0),
      totalSpent: expenses.reduce((s, e) => s + e.amount, 0),
    }

    return NextResponse.json({
      kpis,
      statusCounts,
      priorityCounts,
      tasksPerProject,
      workload,
      bookingsPerRoom,
      modules: moduleRows.map((m) => ({ moduleKey: m.moduleKey, state: m.state })),
      // New module data
      leave: enabled.has('leave')
        ? {
            pending: pendingLeaves,
            onLeaveToday,
            checkedInToday,
            upcoming: leaves
              .filter((l) => new Date(l.startDate) >= now)
              .slice(0, 5)
              .map((l) => ({
                id: l.id,
                userName: l.user?.name,
                type: l.type,
                startDate: l.startDate,
                endDate: l.endDate,
                status: l.status,
              })),
          }
        : null,
      resource: enabled.has('resource') ? { resourceUtilisation } : null,
      kra: enabled.has('kra') ? { kraByStatus, total: kras.length } : null,
      budget: enabled.has('budget') ? { budgetByProject, totalBudget: kpis.totalBudget, totalSpent: kpis.totalSpent } : null,
    })
  })
}
