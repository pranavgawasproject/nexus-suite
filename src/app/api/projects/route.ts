import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

export async function GET() {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ projects: [] })
  const projects = await db.project.findMany({
    where: { orgId: ctx.org.id },
    include: {
      _count: { select: { tasks: true } },
      createdBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const body = await req.json()
  const project = await db.project.create({
    data: {
      orgId: ctx.org.id,
      name: body.name,
      description: body.description || null,
      color: body.color || '#64748b',
      status: body.status || 'active',
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      createdById: ctx.user!.id,
    },
  })
  await db.auditLog.create({
    data: {
      orgId: ctx.org.id,
      actorId: ctx.user?.id,
      action: 'project.created',
      entityType: 'Project',
      entityId: project.id,
      metadata: JSON.stringify({ name: project.name }),
    },
  })
  return NextResponse.json({ project })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const body = await req.json()
  const project = await db.project.update({
    where: { id: body.id, orgId: ctx.org.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.status !== undefined && { status: body.status }),
    },
  })
  return NextResponse.json({ project })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
  await db.project.delete({ where: { id, orgId: ctx.org.id } })
  return NextResponse.json({ ok: true })
}
