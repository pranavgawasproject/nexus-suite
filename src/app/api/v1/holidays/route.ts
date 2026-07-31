import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { z } from 'zod'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Holidays (Module 8 Leave & Attendance).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('leave').
 */

const createHolidaySchema = z.object({
  name: z.string().min(1).max(120),
  date: z.string().datetime(),
  optional: z.boolean().optional().default(false),
})

// GET /api/v1/holidays?limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'leave')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const holidays = await db.holiday.findMany({
    where: { orgId: g.ctx!.orgId },
    select: {
      id: true,
      name: true,
      date: true,
      optional: true,
      createdAt: true,
    },
    orderBy: { date: 'asc' },
    take: limit,
  })

  return apiOk({ holidays })
}

// POST /api/v1/holidays — create holiday (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'leave', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createHolidaySchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  const date = new Date(data.date)

  const existing = await db.holiday.findUnique({
    where: { orgId_date: { orgId: g.ctx!.orgId, date } },
  })
  if (existing) {
    return apiError('A holiday already exists for this date in your organization', 'conflict', 409)
  }

  const holiday = await db.holiday.create({
    data: {
      orgId: g.ctx!.orgId,
      name: data.name,
      date,
      optional: data.optional ?? false,
    },
    select: {
      id: true,
      name: true,
      date: true,
      optional: true,
      createdAt: true,
    },
  })

  await emitEvent(g.ctx!.orgId, 'holiday.created', {
    holiday: {
      id: holiday.id,
      name: holiday.name,
      date: holiday.date,
      optional: holiday.optional,
    },
  })

  return apiOk({ holiday }, 201)
}
