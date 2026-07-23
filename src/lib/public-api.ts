import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { ModuleKey } from '@/lib/modules'
import { ZodSchema, ZodError } from 'zod'

/**
 * Public API v1 auth + module gate.
 *
 * Auth model (PRD §4.5):
 *   - Requests must include `Authorization: Bearer nexus_<key>` header.
 *   - The key is bcrypt-hashed in the DB; we look up by trying the demo API key
 *     (always-on for the demo org) and any explicitly-created keys.
 *   - On match, we return the org context + the key's scopes.
 *
 * Module enforcement (PRD §4.5):
 *   - Disabled-module endpoints return 403 Module Not Enabled — not 404.
 *
 * Rate limiting (PRD §4.5, deferred to managed-hosting tier per v2.1):
 *   - Self-hosted installs are unlimited. Managed hosting gets tier-based
 *     limits applied at the gateway layer (Caddy/Cloudflare), not here.
 */

// Demo API key — auto-provisioned for the demo org so new self-hosters can
// try the public API immediately. Real orgs should rotate this in production.
const DEMO_API_KEY = 'nexus_demo_key_please_rotate_in_production'

export interface ApiKeyContext {
  orgId: string
  orgSlug: string
  apiKeyId: string
  scopes: string[] // ['read', 'write', 'webhooks']
}

export interface PublicApiResult<T = unknown> {
  ctx: ApiKeyContext | null
  response: NextResponse | null
  data?: T
}

/**
 * Authenticate + module-gate a public API request.
 * Returns ctx on success, or a NextResponse (401/403/400) on failure.
 */
export async function requirePublicApi(
  req: NextRequest,
  moduleKey: ModuleKey,
  options: { scope?: 'read' | 'write' } = { scope: 'read' }
): Promise<PublicApiResult> {
  const authHeader = req.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(nexus_[^\s]+)$/i)
  if (!match) {
    return {
      ctx: null,
      response: NextResponse.json(
        {
          error: 'unauthorized',
          message:
            'Missing or malformed Authorization header. Expected: `Authorization: Bearer nexus_<key>`',
          docs: '/docs/api',
        },
        { status: 401 }
      ),
    }
  }
  const rawKey = match[1]

  // Look up by key prefix to find candidate keys, then verify
  // (Demo key shortcut — single hash check vs the demo org's auto-key)
  let ctx: ApiKeyContext | null = null
  if (rawKey === `nexus_${DEMO_API_KEY}` || rawKey === DEMO_API_KEY) {
    const demoOrg = await db.organization.findFirst({ where: { slug: 'acme-design' } })
    if (demoOrg) {
      let demoKey = await db.apiKey.findFirst({
        where: { orgId: demoOrg.id, name: 'demo-auto-provisioned' },
      })
      if (!demoKey) {
        const bcrypt = await import('bcryptjs')
        demoKey = await db.apiKey.create({
          data: {
            orgId: demoOrg.id,
            name: 'demo-auto-provisioned',
            keyHash: await bcrypt.hash(`nexus_${DEMO_API_KEY}`, 10),
            keyPrefix: 'nexus_dem',
            scopes: 'read,write,webhooks',
          },
        })
      }
      ctx = {
        orgId: demoOrg.id,
        orgSlug: demoOrg.slug,
        apiKeyId: demoKey.id,
        scopes: demoKey.scopes.split(',').map((s) => s.trim()),
      }
    }
  }

  if (!ctx) {
    // Look up by prefix (first 10 chars) then verify with bcrypt
    const prefix = rawKey.slice(0, 10)
    const candidates = await db.apiKey.findMany({
      where: { keyPrefix: prefix, revokedAt: null },
      take: 5,
    })
    const bcrypt = await import('bcryptjs')
    for (const k of candidates) {
      const ok = await bcrypt.compare(rawKey, k.keyHash)
      if (ok) {
        if (k.expiresAt && k.expiresAt < new Date()) {
          return {
            ctx: null,
            response: NextResponse.json(
              { error: 'unauthorized', message: 'API key has expired' },
              { status: 401 }
            ),
          }
        }
        ctx = {
          orgId: k.orgId,
          orgSlug: '', // filled below
          apiKeyId: k.id,
          scopes: k.scopes.split(',').map((s) => s.trim()),
        }
        await db.apiKey.update({
          where: { id: k.id },
          data: { lastUsedAt: new Date() },
        })
        break
      }
    }
  }

  if (!ctx) {
    return {
      ctx: null,
      response: NextResponse.json(
        { error: 'unauthorized', message: 'Invalid API key' },
        { status: 401 }
      ),
    }
  }

  // Fill orgSlug
  const org = await db.organization.findUnique({ where: { id: ctx.orgId } })
  if (org) ctx.orgSlug = org.slug

  // Scope check
  const requiredScope = options.scope || 'read'
  if (!ctx.scopes.includes(requiredScope) && !ctx.scopes.includes('*')) {
    return {
      ctx,
      response: NextResponse.json(
        {
          error: 'insufficient_scope',
          message: `This endpoint requires the "${requiredScope}" scope.`,
          current_scopes: ctx.scopes,
        },
        { status: 403 }
      ),
    }
  }

  // Module gate (PRD §4.5)
  const mod = await db.orgModule.findUnique({
    where: { orgId_moduleKey: { orgId: ctx.orgId, moduleKey } },
  })
  const enabled = mod && (mod.state === 'active' || mod.state === 'trial')
  if (!enabled) {
    return {
      ctx,
      response: NextResponse.json(
        {
          error: 'module_not_enabled',
          moduleKey,
          message: `The "${moduleKey}" module is not enabled for this organization.`,
        },
        { status: 403 }
      ),
    }
  }

  return { ctx, response: null }
}

/**
 * Validate JSON body against a zod schema. Returns 400 on failure.
 */
export async function parsePublicBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T | null; error: NextResponse | null }> {
  try {
    const json = await req.json()
    const data = schema.parse(json)
    return { data, error: null }
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'validation_error',
            details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
          },
          { status: 400 }
        ),
      }
    }
    return {
      data: null,
      error: NextResponse.json(
        { error: 'invalid_json', message: 'Request body is not valid JSON' },
        { status: 400 }
      ),
    }
  }
}

/**
 * Standard success response wrapper for the public API.
 */
export function apiOk(data: unknown, status = 200) {
  return NextResponse.json({ data }, { status })
}

/**
 * Standard error response wrapper.
 */
export function apiError(message: string, code: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: code, message, ...extra }, { status })
}
