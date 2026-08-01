import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createRoomSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

// GET /api/v1/rooms — list active rooms in the authenticated org.
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'rooms')
  if (g.response) return g.response

  const rooms = await db.room.findMany({
    where: { orgId: g.ctx!.orgId, active: true },
    select: {
      id: true,
      name: true,
      location: true,
      capacity: true,
      amenities: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
    orderBy: { name: 'asc' },
  })

  return apiOk({ rooms })
}

// POST /api/v1/rooms — create a room (write scope).
// Body: name (required), optional location, capacity, amenities, active.
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'rooms', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createRoomSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const room = await db.room.create({
    data: {
      orgId: g.ctx!.orgId,
      name: data.name,
      location: data.location || null,
      capacity: data.capacity,
      amenities: data.amenities || null,
      active: data.active,
    },
    select: {
      id: true,
      name: true,
      location: true,
      capacity: true,
      amenities: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await emitEvent(g.ctx!.orgId, 'room.created', {
    room: {
      id: room.id,
      name: room.name,
      location: room.location,
      capacity: room.capacity,
    },
  })

  return apiOk({ room }, 201)
}
