import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, apiOk } from '@/lib/public-api'

/**
 * Public API v1 — Team (Core identity).
 * GET /api/v1/team — list org members and departments.
 * Gated on tasks module (default-enabled) so core identity works for integrations
 * that need userIds for assignees, leave, KRAs, etc.
 * Query: role=, departmentId=, limit= (max 100).
 */
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'tasks')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')
  const departmentId = searchParams.get('departmentId')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const [team, departments] = await Promise.all([
    db.user.findMany({
      where: {
        orgId: g.ctx!.orgId,
        ...(role ? { role } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        designation: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
      take: limit,
    }),
    db.department.findMany({
      where: { orgId: g.ctx!.orgId },
      select: {
        id: true,
        name: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ])

  return apiOk({
    team: team.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      designation: u.designation,
      department: u.department,
      createdAt: u.createdAt,
    })),
    departments: departments.map((d) => ({
      id: d.id,
      name: d.name,
      userCount: d._count.users,
    })),
  })
}
