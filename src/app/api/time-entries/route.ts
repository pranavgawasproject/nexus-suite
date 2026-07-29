import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import {
  createTaskTimeEntrySchema,
  updateTaskTimeEntrySchema,
  taskTimeEntryQuerySchema,
} from '@/lib/schemas'

async function recalcSpentHours(orgId: string, taskId: string) {
  const agg = await db.taskTimeEntry.aggregate({
    where: { orgId, taskId },
    _sum: { hours: true },
  })
  const spent = agg._sum.hours ?? 0
  await db.task.update({
    where: { id: taskId },
    data: { spentHours: spent },
  })
  return spent
}

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, taskTimeEntryQuerySchema)
    if (error) return error

    const task = await db.task.findFirst({
      where: { id: data.taskId, orgId: g.ctx!.org.id },
      select: { id: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const entries = await db.taskTimeEntry.findMany({
      where: {
        orgId: g.ctx!.org.id,
        taskId: data.taskId,
      },
      orderBy: [{ loggedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })
    return NextResponse.json({ entries })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createTaskTimeEntrySchema)
    if (error) return error

    const task = await db.task.findFirst({
      where: { id: data.taskId, orgId: g.ctx!.org.id },
      select: { id: true, title: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const userId = data.userId ?? g.ctx!.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Ensure user belongs to same org
    const user = await db.user.findFirst({
      where: { id: userId, orgId: g.ctx!.org.id },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found in organization' }, { status: 404 })
    }

    const entry = await db.taskTimeEntry.create({
      data: {
        orgId: g.ctx!.org.id,
        taskId: data.taskId,
        userId,
        hours: data.hours,
        note: data.note,
        ...(data.loggedAt ? { loggedAt: new Date(data.loggedAt) } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    const spentHours = await recalcSpentHours(g.ctx!.org.id, data.taskId)

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.time_entry.created', 'TaskTimeEntry', entry.id, {
      taskId: data.taskId,
      hours: data.hours,
      spentHours,
    })

    return NextResponse.json({ entry, spentHours }, { status: 201 })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateTaskTimeEntrySchema)
    if (error) return error

    const existing = await db.taskTimeEntry.findFirst({
      where: { id: data.id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    const entry = await db.taskTimeEntry.update({
      where: { id: data.id },
      data: {
        ...(data.hours !== undefined ? { hours: data.hours } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.loggedAt !== undefined ? { loggedAt: new Date(data.loggedAt) } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    const spentHours = await recalcSpentHours(g.ctx!.org.id, entry.taskId)

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.time_entry.updated', 'TaskTimeEntry', entry.id, {
      taskId: entry.taskId,
      hours: entry.hours,
      spentHours,
    })

    return NextResponse.json({ entry, spentHours })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const existing = await db.taskTimeEntry.findFirst({
      where: { id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 })
    }

    await db.taskTimeEntry.delete({ where: { id } })
    const spentHours = await recalcSpentHours(g.ctx!.org.id, existing.taskId)

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.time_entry.deleted', 'TaskTimeEntry', id, {
      taskId: existing.taskId,
      spentHours,
    })
    return NextResponse.json({ ok: true, spentHours })
  })
}
