import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import {
  createTaskCommentSchema,
  updateTaskCommentSchema,
  taskCommentQuerySchema,
} from '@/lib/schemas'
import { createNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, taskCommentQuerySchema)
    if (error) return error

    const task = await db.task.findFirst({
      where: { id: data.taskId, orgId: g.ctx!.org.id },
      select: { id: true, title: true, assigneeId: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const comments = await db.taskComment.findMany({
      where: {
        orgId: g.ctx!.org.id,
        taskId: data.taskId,
      },
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json({ comments })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createTaskCommentSchema)
    if (error) return error

    const task = await db.task.findFirst({
      where: { id: data.taskId, orgId: g.ctx!.org.id },
      select: { id: true, title: true, assigneeId: true, reporterId: true },
    })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const comment = await db.taskComment.create({
      data: {
        orgId: g.ctx!.org.id,
        taskId: data.taskId,
        authorId: g.ctx!.user!.id,
        body: data.body,
      },
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    })

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.comment.created', 'TaskComment', comment.id, {
      taskId: data.taskId,
    })

    const notifyIds = new Set<string>()
    if (task.assigneeId && task.assigneeId !== g.ctx!.user!.id) notifyIds.add(task.assigneeId)
    if (task.reporterId && task.reporterId !== g.ctx!.user!.id) notifyIds.add(task.reporterId)
    for (const uid of notifyIds) {
      await createNotification(g.ctx!.org.id, uid, {
        title: 'New comment on task',
        body: `${g.ctx!.user!.name || 'Someone'} commented on "${task.title}"`,
        category: 'task',
        severity: 'info',
        link: `/tasks?taskId=${task.id}`,
      })
    }

    return NextResponse.json({ comment }, { status: 201 })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateTaskCommentSchema)
    if (error) return error

    const existing = await db.taskComment.findFirst({
      where: { id: data.id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }
    if (existing.authorId !== g.ctx!.user!.id && g.ctx!.user!.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const comment = await db.taskComment.update({
      where: { id: data.id },
      data: { body: data.body },
      include: {
        author: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.comment.updated', 'TaskComment', comment.id, {
      taskId: comment.taskId,
    })
    return NextResponse.json({ comment })
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

    const existing = await db.taskComment.findFirst({
      where: { id, orgId: g.ctx!.org.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }
    if (existing.authorId !== g.ctx!.user!.id && g.ctx!.user!.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.taskComment.delete({ where: { id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.comment.deleted', 'TaskComment', id, {
      taskId: existing.taskId,
    })
    return NextResponse.json({ ok: true })
  })
}
