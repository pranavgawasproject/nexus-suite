import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

export async function GET() {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ logs: [] })
  const logs = await db.auditLog.findMany({
    where: { orgId: ctx.org.id },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return NextResponse.json({ logs })
}
