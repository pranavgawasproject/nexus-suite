import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

export async function GET() {
  const ctx = await getDemoContext()
  if (!ctx || !ctx.user) return NextResponse.json({ notifications: [] })
  const notifications = await db.notification.findMany({
    where: { userId: ctx.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const unread = notifications.filter((n) => !n.readAt).length
  return NextResponse.json({ notifications, unread })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx || !ctx.user) return NextResponse.json({ error: 'no_user' }, { status: 400 })
  const body = await req.json()
  if (body.markAllRead) {
    await db.notification.updateMany({
      where: { userId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }
  if (body.id) {
    await db.notification.update({
      where: { id: body.id, userId: ctx.user.id },
      data: { readAt: new Date() },
    })
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'no_params' }, { status: 400 })
}
