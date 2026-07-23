import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createRoomSchema, updateRoomSchema } from '@/lib/schemas'

export async function GET() {
  return withErrors(async () => {
    const g = await requireModule('rooms')
    if (g.response) return g.response

    const rooms = await db.room.findMany({
      where: { orgId: g.ctx!.org.id },
      include: { _count: { select: { bookings: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ rooms })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('rooms')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createRoomSchema)
    if (error) return error

    const room = await db.room.create({
      data: {
        orgId: g.ctx!.org.id,
        name: data.name,
        location: data.location || null,
        capacity: data.capacity,
        amenities: data.amenities || null,
        active: data.active,
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'room.created', 'Room', room.id, { name: room.name })
    return NextResponse.json({ room })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('rooms')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateRoomSchema)
    if (error) return error

    const room = await db.room.update({
      where: { id: data.id, orgId: g.ctx!.org.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.location !== undefined && { location: data.location }),
        ...(data.capacity !== undefined && { capacity: data.capacity }),
        ...(data.amenities !== undefined && { amenities: data.amenities }),
        ...(data.active !== undefined && { active: data.active }),
      },
    })
    return NextResponse.json({ room })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('rooms')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
    await db.room.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'room.deleted', 'Room', id)
    return NextResponse.json({ ok: true })
  })
}
