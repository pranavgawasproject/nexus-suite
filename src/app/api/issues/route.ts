import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createIssueSchema, updateIssueSchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')
    const severity = searchParams.get('severity')

    const issues = await db.issue.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
        ...(status && status !== 'all' ? { status } : {}),
        ...(severity && severity !== 'all' ? { severity } : {}),
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [
        { escalationLevel: 'desc' },
        { createdAt: 'desc' },
      ],
    })
    return NextResponse.json({ issues })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createIssueSchema)
    if (error) return error

    const issue = await db.issue.create({
      data: {
        orgId: g.ctx!.org.id,
        projectId: data.projectId || null,
        title: data.title,
        description: data.description || null,
        severity: data.severity,
        status: data.status,
        reporterId: data.reporterId || g.ctx!.user?.id || null,
        assigneeId: data.assigneeId || null,
        escalationLevel: data.escalationLevel,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'issue.created', 'Issue', issue.id, {
      title: issue.title, severity: issue.severity,
    })
    if (data.assigneeId) {
      await createNotification(g.ctx!.org.id, data.assigneeId, {
        title: 'New issue assigned',
        body: `“${issue.title}” (${issue.severity}) was assigned to you.`,
        category: 'task',
        severity: issue.severity === 'critical' ? 'error' : 'warning',
        link: 'risk',
      })
    }
    return NextResponse.json({ issue })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateIssueSchema)
    if (error) return error

    const issue = await db.issue.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.status !== undefined && {
          status: data.status,
          resolvedAt: data.status === 'resolved' || data.status === 'closed' ? new Date() : null,
        }),
        ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId || null }),
        ...(data.escalationLevel !== undefined && { escalationLevel: data.escalationLevel }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    return NextResponse.json({ issue })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
    await db.issue.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'issue.deleted', 'Issue', id)
    return NextResponse.json({ ok: true })
  })
}
