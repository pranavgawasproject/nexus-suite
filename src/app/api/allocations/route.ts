import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createAllocationSchema, updateAllocationSchema } from '@/lib/schemas'

// GET allocations — optional ?userId=, ?projectId=
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('resource')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const projectId = searchParams.get('projectId')

    const allocations = await db.allocation.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(userId && userId !== 'all' ? { userId } : {}),
        ...(projectId && projectId !== 'all' ? { projectId } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: { startDate: 'desc' },
    })
    return NextResponse.json({ allocations })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('resource')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createAllocationSchema)
    if (error) return error

    const allocation = await db.allocation.create({
      data: {
        orgId: g.ctx!.org.id,
        userId: data.userId,
        projectId: data.projectId,
        allocationPct: data.allocationPct,
        role: data.role || null,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'allocation.created', 'Allocation', allocation.id, {
      userId: allocation.userId,
      projectId: allocation.projectId,
      pct: allocation.allocationPct,
    })
    return NextResponse.json({ allocation })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('resource')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateAllocationSchema)
    if (error) return error

    const allocation = await db.allocation.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.allocationPct !== undefined && { allocationPct: data.allocationPct }),
        ...(data.endDate !== undefined && { endDate: data.endDate ? new Date(data.endDate) : null }),
        ...(data.role !== undefined && { role: data.role }),
      },
    })
    return NextResponse.json({ allocation })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('resource')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
    await db.allocation.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'allocation.deleted', 'Allocation', id)
    return NextResponse.json({ ok: true })
  })
}
