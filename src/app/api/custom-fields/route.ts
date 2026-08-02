import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { parseBody, audit, withErrors } from '@/lib/api-guard'
import { createCustomFieldSchema, updateCustomFieldSchema } from '@/lib/schemas'


// GET /api/custom-fields?entityType=task
export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const entityType = searchParams.get('entityType')

    const fields = await db.customFieldDef.findMany({
      where: {
        orgId: ctx.org.id,
        ...(entityType ? { entityType } : {}),
        active: true,
      },
      orderBy: { position: 'asc' },
    })

    return NextResponse.json({
      fields: fields.map((f) => ({
        ...f,
        options: f.options ? JSON.parse(f.options) : null,
      })),
    })
  })
}

// POST /api/custom-fields — create a new custom field definition
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { data, error } = await parseBody(req, createCustomFieldSchema)
    if (error) return error

    // Validate options JSON if provided
    if (data.options) {
      try { JSON.parse(data.options) } catch {
        return NextResponse.json({ error: 'invalid_options_json' }, { status: 400 })
      }
    }

    const field = await db.customFieldDef.create({
      data: {
        orgId: ctx.org.id,
        moduleKey: data.moduleKey,
        entityType: data.entityType,
        key: data.key,
        label: data.label,
        type: data.type,
        options: data.options || null,
        defaultValue: data.defaultValue || null,
        required: data.required,
        searchable: data.searchable,
        position: data.position,
        createdById: ctx.user?.id,
      },
    })

    await audit(ctx.org.id, ctx.user?.id, 'custom_field.created', 'CustomFieldDef', field.id, {
      key: field.key, label: field.label, type: field.type, entityType: field.entityType,
    })

    return NextResponse.json({ field })
  })
}

// PATCH /api/custom-fields — update a field definition
export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { data, error } = await parseBody(req, updateCustomFieldSchema)
    if (error) return error

    const field = await db.customFieldDef.update({
      where: { id: data.id, orgId: ctx.org.id },
      data: {
        ...(data.label !== undefined && { label: data.label }),
        ...(data.options !== undefined && { options: data.options }),
        ...(data.defaultValue !== undefined && { defaultValue: data.defaultValue }),
        ...(data.required !== undefined && { required: data.required }),
        ...(data.searchable !== undefined && { searchable: data.searchable }),
        ...(data.position !== undefined && { position: data.position }),
        ...(data.active !== undefined && { active: data.active }),
      },
    })

    return NextResponse.json({ field })
  })
}

// DELETE /api/custom-fields?id=...
export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    // Soft-delete by setting active=false (preserves existing values)
    await db.customFieldDef.update({
      where: { id, orgId: ctx.org.id },
      data: { active: false },
    })
    await audit(ctx.org.id, ctx.user?.id, 'custom_field.deactivated', 'CustomFieldDef', id)
    return NextResponse.json({ ok: true })
  })
}
