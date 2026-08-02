import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { parseBody, withErrors } from '@/lib/api-guard'
import { z } from 'zod'

// GET /api/custom-fields/values?entityType=task&entityId=<id>
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityType and entityId required' }, { status: 400 })
    }

    const values = await db.customFieldValue.findMany({
      where: { orgId: ctx.org.id, entityType, entityId },
      include: { fieldDef: { select: { key: true, label: true, type: true } } },
    })

    return NextResponse.json({ values })
  })
}

const upsertValueSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  fieldDefId: z.string().min(1),
  valueText: z.string().optional().nullable(),
  valueNumber: z.number().optional().nullable(),
  valueDate: z.string().datetime().optional().nullable(),
  valueBool: z.boolean().optional().nullable(),
  valueJson: z.string().optional().nullable(),
})

// POST /api/custom-fields/values — upsert a value
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { data, error } = await parseBody(req, upsertValueSchema)
    if (error) return error

    // Verify the field def belongs to this org
    const def = await db.customFieldDef.findFirst({
      where: { id: data.fieldDefId, orgId: ctx.org.id, active: true },
    })
    if (!def) return NextResponse.json({ error: 'field_not_found' }, { status: 404 })

    const value = await db.customFieldValue.upsert({
      where: { fieldDefId_entityId: { fieldDefId: data.fieldDefId, entityId: data.entityId } },
      create: {
        orgId: ctx.org.id,
        fieldDefId: data.fieldDefId,
        entityType: data.entityType,
        entityId: data.entityId,
        valueText: data.valueText || null,
        valueNumber: data.valueNumber ?? null,
        valueDate: data.valueDate ? new Date(data.valueDate) : null,
        valueBool: data.valueBool ?? null,
        valueJson: data.valueJson || null,
      },
      update: {
        valueText: data.valueText ?? null,
        valueNumber: data.valueNumber ?? null,
        valueDate: data.valueDate ? new Date(data.valueDate) : null,
        valueBool: data.valueBool ?? null,
        valueJson: data.valueJson || null,
      },
    })

    return NextResponse.json({ value })
  })
}
