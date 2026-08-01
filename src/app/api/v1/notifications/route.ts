import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { updateNotificationSchema } from '@/lib/schemas'

/**
 * Public API — Notifications (Core).
 * GET list notifications for the org (read).
 * PATCH mark one or all as read (write).
 * Not module-gated beyond a default enabled module (tasks) so core always works.
 * Filters: userId, category, unreadOnly, limit (max 100).
 */

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

// PATCH /api/v1/notifications — mark one (id) or all (markAllRead + userId) as read
export async function PATCH(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, updateNotificationSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  if (data.markAllRead) {
    // Optional userId in body via extended query is not in schema; mark all org notifications
    // scoped to org only for safety. Prefer passing id for single-user flows.
    const result = await db.notification.updateMany({
      where: {
        orgId: g.ctx!.orgId,
        readAt: null,
      },
      data: { readAt: new Date() },
    })
    return apiOk({ ok: true, marked: result.count })
  }

  if (data.id) {
    const existing = await db.notification.findFirst({
      where: { id: data.id, orgId: g.ctx!.orgId },
      select: { id: true, userId: true, readAt: true },
    })
    if (!existing) {
      return apiError('Notification not found in this organization', 'not_found', 404)
    }
    if (existing.readAt) {
      return apiOk({ ok: true, notification: existing })
    }
    const updated = await db.notification.update({
      where: { id: existing.id },
      data: { readAt: new Date() },
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
    })
    return apiOk({ ok: true, notification: updated })
  }

  return apiError('Provide id or markAllRead', 'validation_error', 400)
}
