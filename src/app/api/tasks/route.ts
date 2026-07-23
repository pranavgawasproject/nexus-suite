import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, taskQuerySchema)
    if (error) return error

    const tasks = await db.task.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(data.projectId && data.projectId !== 'all' ? { projectId: data.projectId } : {}),
        ...(data.status && data.status !== 'all' ? { status: data.status } : {}),
        ...(data.assigneeId && data.assigneeId !== 'all' ? { assigneeId: data.assigneeId } : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { position: 'asc' },
    })
    return NextResponse.json({ tasks })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createTaskSchema)
    if (error) return error

    const maxPos = await db.task.aggregate({
      where: { projectId: data.projectId, status: data.status },
      _max: { position: true },
    })
    const task = await db.task.create({
      data: {
        orgId: g.ctx!.org.id,
        projectId: data.projectId,
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        type: data.type,
        assigneeId: data.assigneeId || null,
        reporterId: data.reporterId || g.ctx!.user!.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        estimateHours: data.estimateHours ?? null,
        tags: data.tags || null,
        position: (maxPos._max.position ?? -1) + 1,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.created', 'Task', task.id, {
      title: task.title,
      projectId: task.projectId,
    })
    if (data.assigneeId && data.assigneeId !== g.ctx!.user?.id) {
      await createNotification(g.ctx!.org.id, data.assigneeId, {
        title: 'New task assigned',
        body: `“${task.title}” was assigned to you.`,
        category: 'task',
        link: 'tasks',
      })
    }
    return NextResponse.json({ task })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateTaskSchema)
    if (error) return error

    const task = await db.task.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId || null }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.estimateHours !== undefined && { estimateHours: data.estimateHours ?? null }),
        ...(data.spentHours !== undefined && { spentHours: data.spentHours }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.position !== undefined && { position: data.position }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    return NextResponse.json({ task })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    await db.task.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.deleted', 'Task', id)
    return NextResponse.json({ ok: true })
  })
}
