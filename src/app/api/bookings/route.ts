import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { createBookingSchema, updateBookingSchema, bookingQuerySchema } from '@/lib/schemas'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('rooms')
    if (g.response) return g.response

    const { data, error } = await parseQuery(req, bookingQuerySchema)
    if (error) return error

    const bookings = await db.booking.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(data.roomId && data.roomId !== 'all' ? { roomId: data.roomId } : {}),
        ...(data.from || data.to
          ? {
              startTime: {
                ...(data.from ? { gte: new Date(data.from) } : {}),
                ...(data.to ? { lte: new Date(data.to) } : {}),
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
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('rooms')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createBookingSchema)
    if (error) return error

    const startTime = new Date(data.startTime)
    const endTime = new Date(data.endTime)

    // Conflict prevention — any overlapping confirmed/pending booking on the same room
    const conflict = await db.booking.findFirst({
      where: {
        roomId: data.roomId,
        orgId: g.ctx!.org.id,
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
        orgId: g.ctx!.org.id,
        roomId: data.roomId,
        bookedById: g.ctx!.user!.id,
        title: data.title,
        description: data.description || null,
        startTime,
        endTime,
        recurring: data.recurring,
        attendees: data.attendees,
        status: 'confirmed',
      },
      include: {
        room: { select: { id: true, name: true, location: true, capacity: true, amenities: true } },
        bookedBy: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    })

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'booking.created', 'Booking', booking.id, {
      roomId: booking.roomId,
      startTime,
      endTime,
    })

    // Recurring instances — generate next 8 occurrences (skipping conflicts)
    if (data.recurring && data.recurring !== 'none') {
      const instances: { startTime: Date; endTime: Date }[] = []
      for (let i = 1; i <= 8; i++) {
        const ns = new Date(startTime)
        const ne = new Date(endTime)
        if (data.recurring === 'daily') {
          ns.setDate(ns.getDate() + i)
          ne.setDate(ne.getDate() + i)
        } else if (data.recurring === 'weekly') {
          ns.setDate(ns.getDate() + i * 7)
          ne.setDate(ne.getDate() + i * 7)
        } else if (data.recurring === 'monthly') {
          ns.setMonth(ns.getMonth() + i)
          ne.setMonth(ne.getMonth() + i)
        }
        const c = await db.booking.findFirst({
          where: {
            roomId: data.roomId,
            orgId: g.ctx!.org.id,
            status: { in: ['confirmed', 'pending'] },
            AND: [{ startTime: { lt: ne } }, { endTime: { gt: ns } }],
          },
        })
        if (!c) instances.push({ startTime: ns, endTime: ne })
      }
      if (instances.length > 0) {
        await db.booking.createMany({
          data: instances.map((i) => ({
            orgId: g.ctx!.org.id,
            roomId: data.roomId,
            bookedById: g.ctx!.user!.id,
            title: data.title,
            description: data.description || null,
            startTime: i.startTime,
            endTime: i.endTime,
            attendees: data.attendees,
            status: 'confirmed',
          })),
        })
      }
    }

    return NextResponse.json({ booking })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('rooms')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateBookingSchema)
    if (error) return error

    const booking = await db.booking.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.attendees !== undefined && { attendees: data.attendees }),
      },
    })
    return NextResponse.json({ booking })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('rooms')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    await db.booking.update({
      where: { id, orgId: g.ctx!.org.id },
      data: { status: 'cancelled' },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'booking.cancelled', 'Booking', id)
    return NextResponse.json({ ok: true })
  })
}
