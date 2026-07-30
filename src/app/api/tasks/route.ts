import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { createTaskSchema, updateTaskSchema, taskQuerySchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notify'

/** Ensure parentId (if set) is a task in the same org + project; not self. */
async function validateParent(
  orgId: string,
  projectId: string,
  parentId: string | null | undefined,
  selfId?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!parentId) return { ok: true }
  if (selfId && parentId === selfId) {
    return { ok: false, error: 'parentId cannot equal task id' }
  }
  const parent = await db.task.findFirst({
    where: { id: parentId, orgId },
    select: { id: true, projectId: true, parentId: true },
  })
  if (!parent) return { ok: false, error: 'parent task not found in org' }
  if (parent.projectId !== projectId) {
    return { ok: false, error: 'parent task must be in the same project' }
  }
  // Disallow nesting under a subtask (one level only) to keep board simple
  if (parent.parentId) {
    return { ok: false, error: 'parent task is itself a subtask; only one nesting level allowed' }
  }
  return { ok: true }
}

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, taskQuerySchema)
    if (error) return error

    const parentFilter =
      data.parentId === 'none'
        ? { parentId: null }
        : data.parentId && data.parentId !== 'all'
          ? { parentId: data.parentId }
          : {}

    const tasks = await db.task.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(data.projectId && data.projectId !== 'all' ? { projectId: data.projectId } : {}),
        ...(data.status && data.status !== 'all' ? { status: data.status } : {}),
        ...(data.assigneeId && data.assigneeId !== 'all' ? { assigneeId: data.assigneeId } : {}),
        ...(data.cycleId && data.cycleId !== 'all' ? { cycleId: data.cycleId } : {}),
        ...(data.milestoneId && data.milestoneId !== 'all' ? { milestoneId: data.milestoneId } : {}),
        ...parentFilter,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
        cycle: { select: { id: true, name: true, status: true } },
        milestone: { select: { id: true, name: true, status: true } },
      },
      orderBy: { position: 'asc' },
    })

    // Attach subtask counts (Prisma has no self-relation named children; count manually)
    const ids = tasks.map((t) => t.id)
    const childCounts =
      ids.length === 0
        ? []
        : await db.task.groupBy({
            by: ['parentId'],
            where: { orgId: g.ctx!.org.id, parentId: { in: ids } },
            _count: { _all: true },
          })
    const countMap = new Map(
      childCounts.filter((c) => c.parentId).map((c) => [c.parentId as string, c._count._all])
    )
    const withCounts = tasks.map((t) => ({
      ...t,
      subtaskCount: countMap.get(t.id) ?? 0,
    }))

    return NextResponse.json({ tasks: withCounts })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createTaskSchema)
    if (error) return error

    const parentCheck = await validateParent(
      g.ctx!.org.id,
      data.projectId,
      data.parentId
    )
    if (!parentCheck.ok) {
      return NextResponse.json({ error: parentCheck.error }, { status: 400 })
    }

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
        cycleId: data.cycleId || null,
        milestoneId: data.milestoneId || null,
        parentId: data.parentId || null,
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
      parentId: task.parentId,
    })
    if (data.assigneeId && data.assigneeId !== g.ctx!.user?.id) {
      await createNotification(g.ctx!.org.id, data.assigneeId, {
        title: 'New task assigned',
        body: `"${task.title}" was assigned to you.`,
        category: 'task',
        link: 'tasks',
      })
    }
    return NextResponse.json({ task: { ...task, subtaskCount: 0 } })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('tasks')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateTaskSchema)
    if (error) return error

    const existing = await db.task.findFirst({
      where: { id: data.id, orgId: g.ctx!.org.id },
      select: { id: true, projectId: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'task not found' }, { status: 404 })
    }

    if (data.parentId !== undefined) {
      const parentCheck = await validateParent(
        g.ctx!.org.id,
        existing.projectId,
        data.parentId,
        data.id
      )
      if (!parentCheck.ok) {
        return NextResponse.json({ error: parentCheck.error }, { status: 400 })
      }
    }

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
        ...(data.cycleId !== undefined && { cycleId: data.cycleId || null }),
        ...(data.milestoneId !== undefined && { milestoneId: data.milestoneId || null }),
        ...(data.parentId !== undefined && { parentId: data.parentId || null }),
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

    // Orphan subtasks (clear parent) then delete — keep children as top-level
    await db.task.updateMany({
      where: { orgId: g.ctx!.org.id, parentId: id },
      data: { parentId: null },
    })

    await db.task.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'task.deleted', 'Task', id)
    return NextResponse.json({ ok: true })
  })
}
