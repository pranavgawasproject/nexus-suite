import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { attendanceSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Attendance (Module 8 Leave & Attendance).
 * GET list (read), POST check-in / check-out (write). Module-gated via requirePublicApi('leave').
 */

// GET /api/v1/attendance?userId=&date=&from=&to=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'leave')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const dateStr = searchParams.get('date')
  const fromStr = searchParams.get('from')
  const toStr = searchParams.get('to')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  let dateFilter: Record<string, unknown> = {}
  if (dateStr) {
    const d = new Date(dateStr)
    d.setUTCHours(0, 0, 0, 0)
    dateFilter = { date: d }
  } else if (fromStr || toStr) {
    dateFilter = {
      date: {
        ...(fromStr ? { gte: new Date(fromStr) } : {}),
        ...(toStr ? { lte: new Date(toStr) } : {}),
      },
    }
  }

  const records = await db.attendance.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(userId && userId !== 'all' ? { userId } : {}),
      ...dateFilter,
    },
    select: {
      id: true,
      userId: true,
      date: true,
      checkIn: true,
      checkOut: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })

  return apiOk({ attendance: records })
}

// POST /api/v1/attendance — check_in / check_out (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'leave', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, attendanceSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const user = await db.user.findFirst({
    where: { id: data.userId, orgId: g.ctx!.orgId },
    select: { id: true, name: true },
  })
  if (!user) {
    return apiError('userId does not belong to this organization', 'not_found', 404)
  }

  const ts = data.timestamp ? new Date(data.timestamp) : new Date()
  const day = new Date(ts)
  day.setUTCHours(0, 0, 0, 0)

  const existing = await db.attendance.findUnique({
    where: {
      orgId_userId_date: {
        orgId: g.ctx!.orgId,
        userId: data.userId,
        date: day,
      },
    },
  })

  if (data.action === 'check_in') {
    if (existing?.checkIn) {
      return apiError('Already checked in today', 'conflict', 409)
    }
    const record = await db.attendance.upsert({
      where: {
        orgId_userId_date: {
          orgId: g.ctx!.orgId,
          userId: data.userId,
          date: day,
        },
      },
      create: {
        orgId: g.ctx!.orgId,
        userId: data.userId,
        date: day,
        checkIn: ts,
      },
      update: { checkIn: ts },
      select: {
        id: true,
        userId: true,
        date: true,
        checkIn: true,
        checkOut: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await emitEvent(g.ctx!.orgId, 'attendance.check_in', {
      attendance: {
        id: record.id,
        userId: record.userId,
        date: record.date,
        checkIn: record.checkIn,
      },
    })

    return apiOk({ attendance: record }, 201)
  }

  // check_out
  if (!existing?.checkIn) {
    return apiError('Must check in first', 'precondition_failed', 400)
  }
  if (existing.checkOut) {
    return apiError('Already checked out today', 'conflict', 409)
  }

  const record = await db.attendance.update({
    where: { id: existing.id },
    data: { checkOut: ts },
    select: {
      id: true,
      userId: true,
      date: true,
      checkIn: true,
      checkOut: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  await emitEvent(g.ctx!.orgId, 'attendance.check_out', {
    attendance: {
      id: record.id,
      userId: record.userId,
      date: record.date,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
    },
  })

  return apiOk({ attendance: record })
}
