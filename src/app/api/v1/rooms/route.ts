import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, apiOk } from '@/lib/public-api'

// GET /api/v1/rooms — list rooms
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
