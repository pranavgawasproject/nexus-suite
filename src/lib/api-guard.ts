import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import type { ModuleKey } from '@/lib/modules'
import { ZodError, ZodSchema } from 'zod'

/**
 * Module gate middleware (PRD §4.5).
 * Disabled-module endpoints must return 403 Module Not Enabled — NOT 404.
 * Returns the demo context (org + user) if the module is enabled, otherwise
 * returns a 403 NextResponse that the caller should return as-is.
 */
export async function requireModule(moduleKey: ModuleKey) {
  const ctx = await getDemoContext()
  if (!ctx || !ctx.user) {
    return {
      ctx: null,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }
  const mod = await db.orgModule.findUnique({
    where: { orgId_moduleKey: { orgId: ctx.org.id, moduleKey } },
  })
  const enabled = mod && (mod.state === 'active' || mod.state === 'trial')
  if (!enabled) {
    return {
      ctx: null,
      response: NextResponse.json(
        {
          error: 'module_not_enabled',
          moduleKey,
          message: `The "${moduleKey}" module is not enabled for this organization. Enable it in Settings → Module Marketplace.`,
        },
        { status: 403 }
      ),
    }
  }
  return { ctx, response: null }
}

/**
 * Parse and validate a JSON request body against a zod schema.
 * On failure, returns a 400 NextResponse with field-level errors.
 *
 * Type-narrowing helper: when `error` is null, `data` is guaranteed non-null.
 * Use as: `const { data, error } = await parseBody(req, schema); if (error) return error;`
 * — TypeScript will narrow `data` to `T` (not `T | null`) after the `if (error) return` guard.
 */
export async function parseBody<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
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
            details: err.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
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
 * Parse and validate URL search params against a zod schema.
 */
export async function parseQuery<T>(
  req: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const params = Object.fromEntries(new URL(req.url).searchParams.entries())
    const data = schema.parse(params)
    return { data, error: null }
  } catch (err) {
    if (err instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'validation_error',
            details: err.issues.map((i) => ({
              path: i.path.join('.'),
              message: i.message,
            })),
          },
          { status: 400 }
        ),
      }
    }
    return {
      data: null,
      error: NextResponse.json({ error: 'invalid_query' }, { status: 400 }),
    }
  }
}

/**
 * Wrap an async handler with uniform error handling.
 * Any thrown Error becomes a 500 with the message.
 */
export async function withErrors<T>(
  fn: () => Promise<NextResponse | T>
): Promise<NextResponse | T> {
  try {
    return await fn()
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error'
    return NextResponse.json({ error: 'internal_error', message }, { status: 500 })
  }
}

/**
 * Audit helper — logs an action with actor + entity metadata.
 */
export async function audit(
  orgId: string,
  actorId: string | undefined | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  metadata?: Record<string, unknown>
) {
  await db.auditLog.create({
    data: {
      orgId,
      actorId: actorId || null,
      action,
      entityType,
      entityId: entityId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  })
}
