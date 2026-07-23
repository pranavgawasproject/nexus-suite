import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getDemoContext } from '@/lib/seed'
import { withErrors } from '@/lib/api-guard'
import { summarizeTask } from '@/lib/ai'

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const ctx = await getDemoContext()
    if (!ctx) return NextResponse.json({ error: 'no_org' }, { status: 400 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })

    const task = await db.task.findFirst({
      where: { id, orgId: ctx.org.id },
      include: {
        assignee: { select: { name: true } },
        project: { select: { name: true } },
      },
    })
    if (!task) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const summary = await summarizeTask({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      type: task.type,
      project: task.project,
      assignee: task.assignee,
    })

    return NextResponse.json({ summary })
  })
}
