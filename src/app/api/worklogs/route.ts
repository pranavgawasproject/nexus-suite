import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import {
  createTaskWorklogSchema,
  updateTaskWorklogSchema,
  taskWorklogQuerySchema,
} from '@/lib/schemas'

async function recalcSpentHours(orgId: string, taskId: string) {
  const agg = await db.taskWorklog.aggregate({
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

    const { data, error } = await parseQuery(req, taskWorklogQuerySchema)
    if (error) return error

    const task = await db.task.findFirst({
      where: { id: data.taskId, orgId: g.ctx!.org.id },
      select: { id: true, spentHours: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const worklogs = await db.taskWorklog.findMany({
      where: {
        orgId: g.ctx!.org.id,
        taskId: data.taskId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ loggedAt: 'desc' }, { createdAt: 'desc' }],
    })
    return NextResponse.json({ worklogs, spentHours: task.spentHours })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createTaskWorklogSchema)
    if (error) return error

    const userId = g.ctx!.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const task = await db.task.findFirst({
      where: { id: data.taskId, orgId: g.ctx!.org.id },
      select: { id: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const worklog = await db.taskWorklog.create({
      data: {
        orgId: g.ctx!.org.id,
        taskId: data.taskId,
        authorId: userId,
        hours: data.hours,
        note: data.note,
        ...(data.loggedAt ? { loggedAt: new Date(data.loggedAt) } : {}),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    })

    const spentHours = await recalcSpentHours(g.ctx!.org.id, data.taskId)

    await audit(g.ctx!.org.id, userId, 'task.worklog.created', 'TaskWorklog', worklog.id, {
      taskId: data.taskId,
      hours: data.hours,
    })

    return NextResponse.json({ worklog, spentHours }, { status: 201 })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateTaskWorklogSchema)
    if (error) return error

    const existing = await db.taskWorklog.findFirst({
      where: { id: data.id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Worklog not found' }, { status: 404 })
    }

    const worklog = await db.taskWorklog.update({
      where: { id: data.id },
      data: {
        ...(data.hours !== undefined ? { hours: data.hours } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.loggedAt !== undefined ? { loggedAt: new Date(data.loggedAt) } : {}),
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    })

    const spentHours = await recalcSpentHours(g.ctx!.org.id, worklog.taskId)

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.worklog.updated', 'TaskWorklog', worklog.id, {
      taskId: worklog.taskId,
      hours: worklog.hours,
    })

    return NextResponse.json({ worklog, spentHours })
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

    const existing = await db.taskWorklog.findFirst({
      where: { id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Worklog not found' }, { status: 404 })
    }

    await db.taskWorklog.delete({ where: { id } })
    const spentHours = await recalcSpentHours(g.ctx!.org.id, existing.taskId)

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.worklog.deleted', 'TaskWorklog', id, {
      taskId: existing.taskId,
    })
    return NextResponse.json({ ok: true, spentHours })
  })
}
