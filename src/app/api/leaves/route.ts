import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { createLeaveSchema, updateLeaveSchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('leave')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const status = searchParams.get('status')

    const leaves = await db.leave.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(userId && userId !== 'all' ? { userId } : {}),
        ...(status && status !== 'all' ? { status } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
        approver: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
    })
    return NextResponse.json({ leaves })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('leave')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createLeaveSchema)
    if (error) return error

    const leave = await db.leave.create({
      data: {
        orgId: g.ctx!.org.id,
        userId: data.userId,
        type: data.type,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        halfDay: data.halfDay,
        status: 'pending',
        reason: data.reason || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
      },
    })

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'leave.created', 'Leave', leave.id, {
      userId: leave.userId,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
    })

    // Notify the user's reporting manager (if any) for approval
    const user = await db.user.findUnique({ where: { id: data.userId } })
    if (user?.reportingManagerId) {
      await createNotification(g.ctx!.org.id, user.reportingManagerId, {
        title: 'Leave approval requested',
        body: `${leave.user?.name} requested ${leave.type} leave from ${leave.startDate.toDateString()} to ${leave.endDate.toDateString()}.`,
        category: 'leave',
        severity: 'info',
        link: 'leave',
      })
    }

    return NextResponse.json({ leave })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('leave')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateLeaveSchema)
    if (error) return error

    const existing = await db.leave.findUnique({ where: { id: data.id, orgId: g.ctx!.org.id } })
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    if (existing.status !== 'pending') {
      return NextResponse.json({ error: `Leave already ${existing.status}` }, { status: 400 })
    }

    const leave = await db.leave.update({
      where: { id: data.id },
      data: {
        status: data.status,
        approverId: g.ctx!.user?.id,
        approverNote: data.approverNote || null,
        decidedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
        approver: { select: { id: true, name: true } },
      },
    })

    await audit(g.ctx!.org.id, g.ctx!.user?.id, `leave.${data.status}`, 'Leave', leave.id, {
      userId: leave.userId,
    })

    await createNotification(g.ctx!.org.id, leave.userId, {
      title: `Leave ${data.status}`,
      body: `Your ${leave.type} leave request was ${data.status}${data.approverNote ? `: ${data.approverNote}` : '.'}`,
      category: 'leave',
      severity: data.status === 'approved' ? 'success' : data.status === 'rejected' ? 'warning' : 'info',
      link: 'leave',
    })

    return NextResponse.json({ leave })
  })
}

void parseQuery
