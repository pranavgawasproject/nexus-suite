import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { parseBody, audit, withErrors } from '@/lib/api-guard'
import { z } from 'zod'
import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'

const createKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
  scopes: z.string().default('read'), // comma-separated: read | write | webhooks
  expiresAt: z.string().datetime().optional().nullable(),
})

// GET /api/api-keys — list keys (without hashes)
export async function GET() {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const keys = await db.apiKey.findMany({
      where: { orgId: ctx.org.id, revokedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ apiKeys: keys })
  })
}

// POST /api/api-keys — create a new key. The raw key is shown ONCE.
export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { data, error } = await parseBody(req, createKeySchema)
    if (error) return error

    // Validate scopes
    const validScopes = ['read', 'write', 'webhooks']
    const requestedScopes = data.scopes.split(',').map((s) => s.trim()).filter(Boolean)
    const invalid = requestedScopes.filter((s) => !validScopes.includes(s))
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: 'invalid_scopes', invalid, valid: validScopes },
        { status: 400 }
      )
    }

    // Generate raw key — format: nexus_<32 hex chars>
    const rawKey = 'nexus_' + randomBytes(16).toString('hex')
    const keyHash = await bcrypt.hash(rawKey, 10)
    const keyPrefix = rawKey.slice(0, 10) // 'nexus_xxxx'

    const key = await db.apiKey.create({
      data: {
        orgId: ctx.org.id,
        name: data.name,
        keyHash,
        keyPrefix,
        scopes: requestedScopes.join(','),
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdById: ctx.user?.id,
      },
    })

    await audit(ctx.org.id, ctx.user?.id, 'api_key.created', 'ApiKey', key.id, {
      name: key.name,
      scopes: key.scopes,
    })

    return NextResponse.json({
      apiKey: {
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
      },
      // Raw key is shown ONCE. Store it securely — it cannot be retrieved later.
      key: rawKey,
      message: 'Save this key — it will not be shown again.',
    })
  })
}

// DELETE /api/api-keys?id=... — revoke a key
export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    await db.apiKey.update({
      where: { id, orgId: ctx.org.id },
      data: { revokedAt: new Date() },
    })
    await audit(ctx.org.id, ctx.user?.id, 'api_key.revoked', 'ApiKey', id)
    return NextResponse.json({ ok: true })
  })
}
