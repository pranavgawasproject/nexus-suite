import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

export async function GET() {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ rooms: [] })
  const rooms = await db.room.findMany({
    where: { orgId: ctx.org.id },
    include: { _count: { select: { bookings: true } } },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json({ rooms })
}

export async function POST(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const body = await req.json()
  const room = await db.room.create({
    data: {
      orgId: ctx.org.id,
      name: body.name,
      location: body.location || null,
      capacity: Number(body.capacity) || 4,
      amenities: body.amenities || null,
      active: body.active !== false,
    },
  })
  await db.auditLog.create({
    data: {
      orgId: ctx.org.id,
      actorId: ctx.user?.id,
      action: 'room.created',
      entityType: 'Room',
      entityId: room.id,
      metadata: JSON.stringify({ name: room.name }),
    },
  })
  return NextResponse.json({ room })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const body = await req.json()
  const room = await db.room.update({
    where: { id: body.id, orgId: ctx.org.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.location !== undefined && { location: body.location }),
      ...(body.capacity !== undefined && { capacity: Number(body.capacity) }),
      ...(body.amenities !== undefined && { amenities: body.amenities }),
      ...(body.active !== undefined && { active: body.active }),
    },
  })
  return NextResponse.json({ room })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
  await db.room.delete({ where: { id, orgId: ctx.org.id } })
  return NextResponse.json({ ok: true })
}
