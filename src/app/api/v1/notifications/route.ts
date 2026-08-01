import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, apiOk } from '@/lib/public-api'

/**
 * Public API — Notifications (Core).
 * GET list notifications for the org (read).
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
