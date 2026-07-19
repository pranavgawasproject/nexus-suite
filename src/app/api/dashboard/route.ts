import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

// Cross-module dashboard data for the Reporting module.
export async function GET() {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

  const [tasks, projects, rooms, bookings, users, modules] = await Promise.all([
    db.task.findMany({ where: { orgId: ctx.org.id }, include: { assignee: true, project: true } }),
    db.project.findMany({ where: { orgId: ctx.org.id } }),
    db.room.findMany({ where: { orgId: ctx.org.id } }),
    db.booking.findMany({ where: { orgId: ctx.org.id }, include: { room: true } }),
    db.user.findMany({ where: { orgId: ctx.org.id } }),
    db.orgModule.findMany({ where: { orgId: ctx.org.id } }),
  ])

  // Task status distribution
  const statusCounts: Record<string, number> = {}
  for (const t of tasks) statusCounts[t.status] = (statusCounts[t.status] || 0) + 1

  // Task priority distribution
  const priorityCounts: Record<string, number> = {}
  for (const t of tasks) priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1

  // Tasks per project
  const tasksPerProject = projects.map((p) => ({
    name: p.name,
    color: p.color,
    count: tasks.filter((t) => t.projectId === p.id).length,
    done: tasks.filter((t) => t.projectId === p.id && t.status === 'done').length,
  }))

  // Workload per assignee
  const workload = users.map((u) => ({
    name: u.name,
    open: tasks.filter((t) => t.assigneeId === u.id && t.status !== 'done').length,
    done: tasks.filter((t) => t.assigneeId === u.id && t.status === 'done').length,
  }))

  // Bookings per room (next 7 days)
  const now = new Date()
  const weekEnd = new Date()
  weekEnd.setDate(weekEnd.getDate() + 7)
  const upcomingBookings = bookings.filter((b) => b.startTime >= now && b.startTime <= weekEnd)
  const bookingsPerRoom = rooms.map((r) => ({
    name: r.name,
    count: upcomingBookings.filter((b) => b.roomId === r.id).length,
  }))

  // Module adoption
  const activeModules = modules.filter((m) => m.state === 'active' || m.state === 'trial').length

  // KPIs
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
    totalModules: modules.length,
  }

  return NextResponse.json({
    kpis,
    statusCounts,
    priorityCounts,
    tasksPerProject,
    workload,
    bookingsPerRoom,
    modules: modules.map((m) => ({ moduleKey: m.moduleKey, state: m.state })),
  })
}
