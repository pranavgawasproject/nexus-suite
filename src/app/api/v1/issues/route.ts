import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createIssueSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Issues (Module 6 Risk & Issue).
 * GET list (read), POST create (write). Module-gated via requirePublicApi('risk').
 */

// GET /api/v1/issues?projectId=&status=&severity=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'risk')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')
  const status = searchParams.get('status')
  const severity = searchParams.get('severity')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const issues = await db.issue.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(projectId && projectId !== 'all' ? { projectId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
      ...(severity && severity !== 'all' ? { severity } : {}),
    },
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      status: true,
      escalationLevel: true,
      dueDate: true,
      resolvedAt: true,
      createdAt: true,
      updatedAt: true,
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true } },
    },
    orderBy: [{ escalationLevel: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  })

  return apiOk({ issues })
}

// POST /api/v1/issues — create issue (write scope)
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'risk', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createIssueSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  if (data.projectId) {
    const project = await db.project.findFirst({
      where: { id: data.projectId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!project) {
      return apiError('projectId not found in your organization', 'not_found', 404)
    }
  }

  if (data.assigneeId) {
    const assignee = await db.user.findFirst({
      where: { id: data.assigneeId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!assignee) {
      return apiError('assigneeId not found in your organization', 'not_found', 404)
    }
  }

  if (data.reporterId) {
    const reporter = await db.user.findFirst({
      where: { id: data.reporterId, orgId: g.ctx!.orgId },
      select: { id: true },
    })
    if (!reporter) {
      return apiError('reporterId not found in your organization', 'not_found', 404)
    }
  }

  const issue = await db.issue.create({
    data: {
      orgId: g.ctx!.orgId,
      projectId: data.projectId || null,
      title: data.title,
      description: data.description || null,
      severity: data.severity,
      status: data.status,
      reporterId: data.reporterId || null,
      assigneeId: data.assigneeId || null,
      escalationLevel: data.escalationLevel ?? 0,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
    },
    select: {
      id: true,
      title: true,
      description: true,
      severity: true,
      status: true,
      escalationLevel: true,
      dueDate: true,
      createdAt: true,
      reporter: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      project: { select: { id: true, name: true, color: true } },
    },
  })

  await emitEvent(g.ctx!.orgId, 'issue.created', {
    issue: {
      id: issue.id,
      title: issue.title,
      severity: issue.severity,
      status: issue.status,
    },
  })

  return apiOk({ issue }, 201)
}
