import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'

export async function GET() {
  const ctx = await getDemoContext()
  if (!ctx) return NextResponse.json({ team: [], departments: [] })
  const [team, departments] = await Promise.all([
    db.user.findMany({
      where: { orgId: ctx.org.id },
      include: { department: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    }),
    db.department.findMany({
      where: { orgId: ctx.org.id },
      include: { _count: { select: { users: true } } },
    }),
  ])
  return NextResponse.json({
    team: team.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      designation: u.designation,
      department: u.department,
      createdAt: u.createdAt,
    })),
    departments,
  })
}
