import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createBookingSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

// GET /api/v1/bookings — list upcoming bookings
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'rooms')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const roomId = searchParams.get('roomId')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const bookings = await db.booking.findMany({
    where: {
      orgId: g.ctx!.orgId,
      status: { in: ['confirmed', 'pending'] },
      ...(roomId ? { roomId } : {}),
      ...(from || to
        ? {
            startTime: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      attendees: true,
      recurring: true,
      status: true,
      room: { select: { id: true, name: true, location: true, capacity: true } },
    },
    orderBy: { startTime: 'asc' },
    take: 100,
  })

  return apiOk({ bookings })
}

// POST /api/v1/bookings — create a booking (with conflict prevention)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'rooms', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createBookingSchema)
  if (error) return error

  const startTime = new Date(data.startTime)
  const endTime = new Date(data.endTime)

  // Verify the room belongs to this org
  const room = await db.room.findFirst({
    where: { id: data.roomId, orgId: g.ctx!.orgId },
  })
  if (!room) {
    return apiError('Room not found in your org', 'not_found', 404)
  }

  // Conflict check
  const conflict = await db.booking.findFirst({
    where: {
      roomId: data.roomId,
      orgId: g.ctx!.orgId,
      status: { in: ['confirmed', 'pending'] },
      AND: [{ startTime: { lt: endTime } }, { endTime: { gt: startTime } }],
    },
  })
  if (conflict) {
    return apiError('Time slot conflicts with an existing booking', 'booking_conflict', 409, {
      conflict: { id: conflict.id, title: conflict.title, startTime: conflict.startTime, endTime: conflict.endTime },
    })
  }

  // For public API bookings, we need a bookedBy user. Use the first admin in the org.
  const adminUser = await db.user.findFirst({
    where: { orgId: g.ctx!.orgId, role: 'admin' },
  })
  if (!adminUser) {
    return apiError('No admin user found in your org to attribute this booking to', 'no_admin', 500)
  }

  const booking = await db.booking.create({
    data: {
      orgId: g.ctx!.orgId,
      roomId: data.roomId,
      bookedById: adminUser.id,
      title: data.title,
      description: data.description || null,
      startTime,
      endTime,
      attendees: data.attendees,
      status: 'confirmed',
    },
    select: {
      id: true, title: true, startTime: true, endTime: true, attendees: true, status: true,
      room: { select: { id: true, name: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'booking.confirmed', { booking })

  return apiOk({ booking }, 201)
}
