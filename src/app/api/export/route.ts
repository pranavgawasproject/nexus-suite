import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

// Data export — per-module JSON / CSV. Anti-lock-in feature per PRD §5.
export async function GET(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const moduleKey = searchParams.get('module') || 'all'
  const format = searchParams.get('format') || 'json'

  const payload: Record<string, unknown> = {
    exportedAt: new Date().toISOString(),
    org: { name: ctx.org.name, slug: ctx.org.slug, plan: ctx.org.plan },
  }

  const includeAll = moduleKey === 'all'

  if (includeAll || moduleKey === 'tasks') {
    payload.tasks = await db.task.findMany({ where: { orgId: ctx.org.id }, include: { project: true, assignee: true, reporter: true } })
    payload.projects = await db.project.findMany({ where: { orgId: ctx.org.id } })
  }
  if (includeAll || moduleKey === 'rooms') {
    payload.rooms = await db.room.findMany({ where: { orgId: ctx.org.id } })
    payload.bookings = await db.booking.findMany({ where: { orgId: ctx.org.id }, include: { room: true, bookedBy: true } })
  }
  if (includeAll || moduleKey === 'leave') {
    payload.leaves = await db.leave.findMany({ where: { orgId: ctx.org.id } })
    payload.attendance = await db.attendance.findMany({ where: { orgId: ctx.org.id } })
    payload.holidays = await db.holiday.findMany({ where: { orgId: ctx.org.id } })
  }
  if (includeAll || moduleKey === 'resource') {
    payload.allocations = await db.allocation.findMany({ where: { orgId: ctx.org.id } })
  }
  if (includeAll || moduleKey === 'kra') {
    payload.kras = await db.kra.findMany({ where: { orgId: ctx.org.id } })
  }
  if (includeAll || moduleKey === 'budget') {
    payload.budgets = await db.budget.findMany({ where: { orgId: ctx.org.id } })
    payload.expenses = await db.expense.findMany({ where: { orgId: ctx.org.id } })
  }
  if (includeAll || moduleKey === 'team') {
    payload.users = await db.user.findMany({ where: { orgId: ctx.org.id } })
    payload.departments = await db.department.findMany({ where: { orgId: ctx.org.id } })
  }
  if (includeAll || moduleKey === 'risk') {
    payload.risks = await db.risk.findMany({ where: { orgId: ctx.org.id } })
    payload.issues = await db.issue.findMany({ where: { orgId: ctx.org.id } })
    payload.changeRequests = await db.changeRequest.findMany({ where: { orgId: ctx.org.id } })
  }
  if (includeAll || moduleKey === 'governance') {
    payload.policies = await db.policy.findMany({ where: { orgId: ctx.org.id } })
    payload.signatures = await db.signature.findMany({ where: { orgId: ctx.org.id } })
  }
  if (includeAll) {
    payload.modules = await db.orgModule.findMany({ where: { orgId: ctx.org.id } })
    payload.auditLogs = await db.auditLog.findMany({ where: { orgId: ctx.org.id } })
  }

  if (format === 'csv') {
    const firstArrayKey = Object.keys(payload).find((k) => Array.isArray(payload[k]))
    if (!firstArrayKey) {
      return NextResponse.json({ error: 'no_array_data' }, { status: 400 })
    }
    const arr = payload[firstArrayKey] as Array<Record<string, unknown>>
    if (arr.length === 0) {
      return new NextResponse('No data', { status: 200, headers: { 'Content-Type': 'text/csv' } })
    }
    const headers = Object.keys(arr[0]).filter((k) => typeof arr[0][k] !== 'object' || arr[0][k] === null)
    const rows = arr.map((r) =>
      headers.map((h) => {
        const v = r[h]
        if (v === null || v === undefined) return ''
        const s = String(v).replace(/"/g, '""')
        return /[",\n]/.test(s) ? `"${s}"` : s
      }).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="nexus-${moduleKey}-${Date.now()}.csv"`,
      },
    })
  }

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="nexus-${moduleKey}-${Date.now()}.json"`,
    },
  })
}
