import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import {
  createTaskChecklistItemSchema,
  updateTaskChecklistItemSchema,
  taskChecklistQuerySchema,
} from '@/lib/schemas'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, taskChecklistQuerySchema)
    if (error) return error

    const task = await db.task.findFirst({
      where: { id: data.taskId, orgId: g.ctx!.org.id },
      select: { id: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const items = await db.taskChecklistItem.findMany({
      where: {
        orgId: g.ctx!.org.id,
        taskId: data.taskId,
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    })
    return NextResponse.json({ items })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createTaskChecklistItemSchema)
    if (error) return error

    const task = await db.task.findFirst({
      where: { id: data.taskId, orgId: g.ctx!.org.id },
      select: { id: true, title: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    let position = data.position
    if (position === undefined) {
      const last = await db.taskChecklistItem.findFirst({
        where: { orgId: g.ctx!.org.id, taskId: data.taskId },
        orderBy: { position: 'desc' },
        select: { position: true },
      })
      position = (last?.position ?? -1) + 1
    }

    const item = await db.taskChecklistItem.create({
      data: {
        orgId: g.ctx!.org.id,
        taskId: data.taskId,
        title: data.title,
        position,
      },
    })

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.checklist.created', 'TaskChecklistItem', item.id, {
      taskId: data.taskId,
      title: data.title,
    })

    return NextResponse.json({ item }, { status: 201 })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateTaskChecklistItemSchema)
    if (error) return error

    const existing = await db.taskChecklistItem.findFirst({
      where: { id: data.id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const item = await db.taskChecklistItem.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.completed !== undefined ? { completed: data.completed } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
      },
    })

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.checklist.updated', 'TaskChecklistItem', item.id, {
      taskId: item.taskId,
      completed: item.completed,
    })

    return NextResponse.json({ item })
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

    const existing = await db.taskChecklistItem.findFirst({
      where: { id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    await db.taskChecklistItem.delete({ where: { id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.checklist.deleted', 'TaskChecklistItem', id, {
      taskId: existing.taskId,
    })
    return NextResponse.json({ ok: true })
  })
}
