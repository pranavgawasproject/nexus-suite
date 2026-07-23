import { db } from '@/lib/db'

/**
 * Create a notification for a user within an org.
 * Central helper used by all module API routes — supports the cross-module
 * notification architecture described in PRD §5.5.
 */
export async function createNotification(
  orgId: string,
  userId: string,
  payload: {
    title: string
    body: string
    category?: string // task | booking | system | mention | leave | kra | budget
    severity?: string // info | success | warning | error
    link?: string | null
  }
) {
  return db.notification.create({
    data: {
      orgId,
      userId,
      title: payload.title,
      body: payload.body,
      category: payload.category || 'general',
      severity: payload.severity || 'info',
      link: payload.link || null,
    },
  })
}
