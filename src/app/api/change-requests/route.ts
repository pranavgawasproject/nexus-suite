import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createChangeRequestSchema, updateChangeRequestSchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    const changeRequests = await db.changeRequest.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
        ...(status && status !== 'all' ? { status } : {}),
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ changeRequests })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createChangeRequestSchema)
    if (error) return error

    const cr = await db.changeRequest.create({
      data: {
        orgId: g.ctx!.org.id,
        projectId: data.projectId || null,
        title: data.title,
        description: data.description || null,
        type: data.type,
        status: 'pending',
        requestedById: g.ctx!.user?.id,
        impactAssessment: data.impactAssessment || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'change_request.created', 'ChangeRequest', cr.id, {
      title: cr.title, type: cr.type,
    })

    // Notify admins for emergency CRs
    if (data.type === 'emergency') {
      const admins = await db.user.findMany({ where: { orgId: g.ctx!.org.id, role: 'admin' } })
      await Promise.all(admins.map((a) => createNotification(g.ctx!.org.id, a.id, {
        title: 'Emergency change request',
        body: `“${cr.title}” requires immediate attention.`,
        category: 'task',
        severity: 'error',
        link: 'risk',
      })))
    }
    return NextResponse.json({ changeRequest: cr })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('risk')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateChangeRequestSchema)
    if (error) return error

    const cr = await db.changeRequest.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        status: data.status,
        decidedAt: ['approved', 'rejected', 'implemented'].includes(data.status) ? new Date() : undefined,
        ...(data.impactAssessment !== undefined && { impactAssessment: data.impactAssessment }),
        ...(data.implementationNotes !== undefined && { implementationNotes: data.implementationNotes }),
      },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, `change_request.${data.status}`, 'ChangeRequest', cr.id, {})

    // Notify requester
    if (cr.requestedById) {
      await createNotification(g.ctx!.org.id, cr.requestedById, {
        title: `Change request ${data.status}`,
        body: `“${cr.title}” was ${data.status}.`,
        category: 'task',
        severity: data.status === 'approved' ? 'success' : data.status === 'rejected' ? 'warning' : 'info',
        link: 'risk',
      })
    }
    return NextResponse.json({ changeRequest: cr })
  })
}
