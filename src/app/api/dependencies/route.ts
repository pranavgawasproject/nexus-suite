import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import {
  createTaskDependencySchema,
  taskDependencyQuerySchema,
} from '@/lib/schemas'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, taskDependencyQuerySchema)
    if (error) return error

    if (data.taskId) {
      const task = await db.task.findFirst({
        where: { id: data.taskId, orgId: g.ctx!.org.id },
        select: { id: true },
      })
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
    }

    const dependencies = await db.taskDependency.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(data.taskId
          ? { OR: [{ fromTaskId: data.taskId }, { toTaskId: data.taskId }] }
          : {}),
      },
      include: {
        fromTask: { select: { id: true, title: true, status: true } },
        toTask: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ dependencies })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createTaskDependencySchema)
    if (error) return error

    const fromTask = await db.task.findFirst({
      where: { id: data.fromTaskId, orgId: g.ctx!.org.id },
      select: { id: true, title: true },
    })
    const toTask = await db.task.findFirst({
      where: { id: data.toTaskId, orgId: g.ctx!.org.id },
      select: { id: true, title: true },
    })
    if (!fromTask || !toTask) {
      return NextResponse.json({ error: 'One or both tasks not found' }, { status: 404 })
    }

    const existing = await db.taskDependency.findFirst({
      where: {
        orgId: g.ctx!.org.id,
        fromTaskId: data.fromTaskId,
        toTaskId: data.toTaskId,
        type: data.type,
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 })
    }

    const dependency = await db.taskDependency.create({
      data: {
        orgId: g.ctx!.org.id,
        fromTaskId: data.fromTaskId,
        toTaskId: data.toTaskId,
        type: data.type,
      },
      include: {
        fromTask: { select: { id: true, title: true, status: true } },
        toTask: { select: { id: true, title: true, status: true } },
      },
    })

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.dependency.created', 'TaskDependency', dependency.id, {
      fromTaskId: data.fromTaskId,
      toTaskId: data.toTaskId,
      type: data.type,
    })

    return NextResponse.json({ dependency }, { status: 201 })
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

    const existing = await db.taskDependency.findFirst({
      where: { id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 })
    }

    await db.taskDependency.delete({ where: { id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.dependency.deleted', 'TaskDependency', id, {
      fromTaskId: existing.fromTaskId,
      toTaskId: existing.toTaskId,
    })
    return NextResponse.json({ ok: true })
  })
}
