import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requirePublicApi, apiOk, parsePublicBody, apiError } from '@/lib/public-api'

/**
 * Public API — Notifications (Core).
 * GET list notifications for the org (read).
 * PATCH mark one or all as read (write).
 * Gated on tasks module so core always works when tasks is enabled (default).
 * GET filters: userId, category, unreadOnly, limit (max 100).
 * PATCH body: { id?: string, markAllRead?: boolean, userId?: string }
 */

const patchSchema = z.object({
  id: z.string().optional(),
  markAllRead: z.boolean().optional(),
  userId: z.string().optional(),
})

// GET /api/v1/notifications?userId=&category=&unreadOnly=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const category = searchParams.get('category')
  const unreadOnly = searchParams.get('unreadOnly') === 'true' || searchParams.get('unreadOnly') === '1'
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const notifications = await db.notification.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(userId ? { userId } : {}),
      ...(category ? { category } : {}),
      ...(unreadOnly ? { readAt: null } : {}),
    },
    select: {
      id: true,
      userId: true,
      title: true,
      body: true,
      category: true,
      severity: true,
      readAt: true,
      link: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
  })

  const unread = notifications.filter((n) => !n.readAt).length

  return apiOk({ notifications, unread })
}

// PATCH /api/v1/notifications
export async function PATCH(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, patchSchema)
  if (error) return error

  if (data.markAllRead) {
    const result = await db.notification.updateMany({
      where: {
        orgId: g.ctx!.orgId,
        readAt: null,
        ...(data.userId ? { userId: data.userId } : {}),
      },
      data: { readAt: new Date() },
    })
    return apiOk({ ok: true, updated: result.count })
  }

  if (data.id) {
    const existing = await db.notification.findFirst({
      where: { id: data.id, orgId: g.ctx!.orgId },
    })
    if (!existing) {
      return apiError('Notification not found', 'not_found', 404)
    }
    await db.notification.update({
      where: { id: data.id },
      data: { readAt: new Date() },
    })
    return apiOk({ ok: true, id: data.id })
  }

  return apiError('Provide id or markAllRead=true', 'validation_error', 400)
}
