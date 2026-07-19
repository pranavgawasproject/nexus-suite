import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

// Cross-module global search — searches tasks, projects, rooms, bookings, users.
export async function GET(req: NextRequest) {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ results: [] })
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const [tasks, projects, rooms, bookings, users] = await Promise.all([
    db.task.findMany({
      where: { orgId: ctx.org.id, title: { contains: q } },
      take: 5,
      include: { project: { select: { name: true, color: true } } },
    }),
    db.project.findMany({ where: { orgId: ctx.org.id, name: { contains: q } }, take: 5 }),
    db.room.findMany({ where: { orgId: ctx.org.id, name: { contains: q } }, take: 3 }),
    db.booking.findMany({
      where: { orgId: ctx.org.id, title: { contains: q } },
      take: 5,
      include: { room: { select: { name: true } } },
    }),
    db.user.findMany({
      where: { orgId: ctx.org.id, OR: [{ name: { contains: q } }, { email: { contains: q } }] },
      take: 5,
    }),
  ])

  const results = [
    ...tasks.map((t) => ({ type: 'task', id: t.id, title: t.title, subtitle: t.project?.name, view: 'tasks' })),
    ...projects.map((p) => ({ type: 'project', id: p.id, title: p.name, subtitle: p.status, view: 'tasks' })),
    ...rooms.map((r) => ({ type: 'room', id: r.id, title: r.name, subtitle: r.location, view: 'rooms' })),
    ...bookings.map((b) => ({ type: 'booking', id: b.id, title: b.title, subtitle: b.room?.name, view: 'rooms' })),
    ...users.map((u) => ({ type: 'person', id: u.id, title: u.name, subtitle: u.email, view: 'team' })),
  ]

  return NextResponse.json({ results })
}
