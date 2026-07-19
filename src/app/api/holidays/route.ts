import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, audit, withErrors } from '@/lib/api-guard'
import { z } from 'zod'

const createHolidaySchema = z.object({
  name: z.string().min(1).max(120),
  date: z.string().datetime(),
  optional: z.boolean().optional().default(false),
})

export async function GET() {
  return withErrors(async () => {
    const g = await requireModule('leave')
    if (g.response) return g.response

    const holidays = await db.holiday.findMany({
      where: { orgId: g.ctx!.org.id },
      orderBy: { date: 'asc' },
    })
    return NextResponse.json({ holidays })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('leave')
    if (g.response) return g.response

    const body = await req.json().catch(() => null)
    const parsed = createHolidaySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'validation_error', details: parsed.error.issues }, { status: 400 })
    }

    const holiday = await db.holiday.create({
      data: {
        orgId: g.ctx!.org.id,
        name: parsed.data.name,
        date: new Date(parsed.data.date),
        optional: parsed.data.optional,
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'holiday.created', 'Holiday', holiday.id, { name: holiday.name })
    return NextResponse.json({ holiday })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('leave')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
    await db.holiday.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'holiday.deleted', 'Holiday', id)
    return NextResponse.json({ ok: true })
  })
}
