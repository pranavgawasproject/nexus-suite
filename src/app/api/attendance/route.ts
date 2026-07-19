import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, parseQuery, audit, withErrors } from '@/lib/api-guard'
import { attendanceSchema } from '@/lib/schemas'

// GET attendance records — optional ?userId=, ?date=YYYY-MM-DD, ?from=&to=
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('leave')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const dateStr = searchParams.get('date')
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

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
        orgId: g.ctx!.org.id,
        ...(userId && userId !== 'all' ? { userId } : {}),
        ...dateFilter,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
      },
      orderBy: { date: 'desc' },
      take: 200,
    })
    return NextResponse.json({ attendance: records })
  })
}

// POST check-in / check-out
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('leave')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, attendanceSchema)
    if (error) return error

    const ts = data.timestamp ? new Date(data.timestamp) : new Date()
    const day = new Date(ts)
    day.setUTCHours(0, 0, 0, 0)

    const existing = await db.attendance.findUnique({
      where: {
        orgId_userId_date: {
          orgId: g.ctx!.org.id,
          userId: data.userId,
          date: day,
        },
      },
    })

    if (data.action === 'check_in') {
      if (existing?.checkIn) {
        return NextResponse.json({ error: 'Already checked in today' }, { status: 400 })
      }
      const record = await db.attendance.upsert({
        where: {
          orgId_userId_date: {
            orgId: g.ctx!.org.id,
            userId: data.userId,
            date: day,
          },
        },
        create: {
          orgId: g.ctx!.org.id,
          userId: data.userId,
          date: day,
          checkIn: ts,
        },
        update: { checkIn: ts },
      })
      await audit(g.ctx!.org.id, g.ctx!.user?.id, 'attendance.check_in', 'Attendance', record.id, {
        userId: data.userId,
        time: ts,
      })
      return NextResponse.json({ attendance: record })
    }

    // check_out
    if (!existing?.checkIn) {
      return NextResponse.json({ error: 'Must check in first' }, { status: 400 })
    }
    if (existing.checkOut) {
      return NextResponse.json({ error: 'Already checked out today' }, { status: 400 })
    }
    const record = await db.attendance.update({
      where: { id: existing.id },
      data: { checkOut: ts },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'attendance.check_out', 'Attendance', record.id, {
      userId: data.userId,
      time: ts,
    })
    return NextResponse.json({ attendance: record })
  })
}

void parseQuery
