import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

export async function GET(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ tasks: [] })
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const assigneeId = searchParams.get('assigneeId')

  const tasks = await db.task.findMany({
    where: {
      orgId: ctx.org.id,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(assigneeId && assigneeId !== 'all' ? { assigneeId } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      reporter: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: { position: 'asc' },
  })
  return NextResponse.json({ tasks })
}

export async function POST(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const body = await req.json()
  const maxPos = await db.task.aggregate({
    where: { projectId: body.projectId, status: body.status || 'todo' },
    _max: { position: true },
  })
  const task = await db.task.create({
    data: {
      orgId: ctx.org.id,
      projectId: body.projectId,
      title: body.title,
      description: body.description || null,
      status: body.status || 'todo',
      priority: body.priority || 'medium',
      type: body.type || 'task',
      assigneeId: body.assigneeId || null,
      reporterId: body.reporterId || ctx.user!.id,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      estimateHours: body.estimateHours ? Number(body.estimateHours) : null,
      tags: body.tags || null,
      position: (maxPos._max.position ?? -1) + 1,
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      reporter: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  })
  await db.auditLog.create({
    data: {
      orgId: ctx.org.id,
      actorId: ctx.user?.id,
      action: 'task.created',
      entityType: 'Task',
      entityId: task.id,
      metadata: JSON.stringify({ title: task.title, projectId: task.projectId }),
    },
  })
  if (body.assigneeId && body.assigneeId !== ctx.user?.id) {
    await db.notification.create({
      data: {
        orgId: ctx.org.id,
        userId: body.assigneeId,
        title: 'New task assigned',
        body: `“${task.title}” was assigned to you.`,
        category: 'task',
        severity: 'info',
        link: 'tasks',
      },
    })
  }
  return NextResponse.json({ task })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const body = await req.json()
  const task = await db.task.update({
    where: { id: body.id, orgId: ctx.org.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      ...(body.type !== undefined && { type: body.type }),
      ...(body.assigneeId !== undefined && { assigneeId: body.assigneeId || null }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate ? new Date(body.dueDate) : null }),
      ...(body.estimateHours !== undefined && { estimateHours: body.estimateHours ? Number(body.estimateHours) : null }),
      ...(body.spentHours !== undefined && { spentHours: Number(body.spentHours) || 0 }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.position !== undefined && { position: Number(body.position) }),
    },
    include: {
      assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
      reporter: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  })
  return NextResponse.json({ task })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
  await db.task.delete({ where: { id, orgId: ctx.org.id } })
  return NextResponse.json({ ok: true })
}
