import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

export async function GET(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ bookings: [] })
  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const bookings = await db.booking.findMany({
    where: {
      orgId: ctx.org.id,
      ...(roomId && roomId !== 'all' ? { roomId } : {}),
      ...(from || to
        ? {
            startTime: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      room: { select: { id: true, name: true, location: true, capacity: true, amenities: true } },
      bookedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
    orderBy: { startTime: 'asc' },
  })
  return NextResponse.json({ bookings })
}

export async function POST(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const body = await req.json()

  const startTime = new Date(body.startTime)
  const endTime = new Date(body.endTime)

  if (endTime <= startTime) {
    return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 })
  }

  // Conflict prevention: any overlapping confirmed booking on the same room
  const conflict = await db.booking.findFirst({
    where: {
      roomId: body.roomId,
      orgId: ctx.org.id,
      status: { in: ['confirmed', 'pending'] },
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  })
  if (conflict) {
    return NextResponse.json(
      { error: 'Time slot conflicts with an existing booking', conflict },
      { status: 409 }
    )
  }

  const booking = await db.booking.create({
    data: {
      orgId: ctx.org.id,
      roomId: body.roomId,
      bookedById: ctx.user!.id,
      title: body.title,
      description: body.description || null,
      startTime,
      endTime,
      recurring: body.recurring || null,
      attendees: Number(body.attendees) || 1,
      status: 'confirmed',
    },
    include: {
      room: { select: { id: true, name: true, location: true, capacity: true, amenities: true } },
      bookedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  })

  await db.auditLog.create({
    data: {
      orgId: ctx.org.id,
      actorId: ctx.user?.id,
      action: 'booking.created',
      entityType: 'Booking',
      entityId: booking.id,
      metadata: JSON.stringify({ roomId: booking.roomId, startTime, endTime }),
    },
  })

  // Create recurring instances if requested (next 8 occurrences)
  if (body.recurring && body.recurring !== 'none') {
    const instances: { startTime: Date; endTime: Date }[] = []
    for (let i = 1; i <= 8; i++) {
      const ns = new Date(startTime)
      const ne = new Date(endTime)
      if (body.recurring === 'daily') {
        ns.setDate(ns.getDate() + i)
        ne.setDate(ne.getDate() + i)
      } else if (body.recurring === 'weekly') {
        ns.setDate(ns.getDate() + i * 7)
        ne.setDate(ne.getDate() + i * 7)
      } else if (body.recurring === 'monthly') {
        ns.setMonth(ns.getMonth() + i)
        ne.setMonth(ne.getMonth() + i)
      }
      // Skip if conflict
      const c = await db.booking.findFirst({
        where: {
          roomId: body.roomId,
          orgId: ctx.org.id,
          status: { in: ['confirmed', 'pending'] },
          AND: [{ startTime: { lt: ne } }, { endTime: { gt: ns } }],
        },
      })
      if (!c) instances.push({ startTime: ns, endTime: ne })
    }
    if (instances.length > 0) {
      await db.booking.createMany({
        data: instances.map((i) => ({
          orgId: ctx.org.id,
          roomId: body.roomId,
          bookedById: ctx.user!.id,
          title: body.title,
          description: body.description || null,
          startTime: i.startTime,
          endTime: i.endTime,
          attendees: Number(body.attendees) || 1,
          status: 'confirmed',
        })),
      })
    }
  }

  return NextResponse.json({ booking })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const body = await req.json()
  const booking = await db.booking.update({
    where: { id: body.id, orgId: ctx.org.id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.attendees !== undefined && { attendees: Number(body.attendees) }),
    },
  })
  return NextResponse.json({ booking })
}

export async function DELETE(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
  await db.booking.update({
    where: { id, orgId: ctx.org.id },
    data: { status: 'cancelled' },
  })
  return NextResponse.json({ ok: true })
}
