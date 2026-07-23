import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireModule, parseBody, audit, withErrors } from '@/lib/api-guard'
import { createKraSchema, updateKraSchema } from '@/lib/schemas'
import { createNotification } from '@/lib/notify'

export async function GET(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('kra')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const cycle = searchParams.get('cycle')
    const status = searchParams.get('status')

    const kras = await db.kra.findMany({
      where: {
        orgId: g.ctx!.org.id,
        ...(userId && userId !== 'all' ? { userId } : {}),
        ...(cycle && cycle !== 'all' ? { cycle } : {}),
        ...(status && status !== 'all' ? { status } : {}),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ kras })
  })
}

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('kra')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, createKraSchema)
    if (error) return error

    const kra = await db.kra.create({
      data: {
        orgId: g.ctx!.org.id,
        userId: data.userId,
        title: data.title,
        description: data.description || null,
        cycle: data.cycle,
        weight: data.weight,
        targetRating: data.targetRating,
        status: 'draft',
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
      },
    })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'kra.created', 'Kra', kra.id, {
      userId: kra.userId,
      cycle: kra.cycle,
    })
    return NextResponse.json({ kra })
  })
}

export async function PATCH(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('kra')
    if (g.response) return g.response

    const { data, error } = await parseBody(req, updateKraSchema)
    if (error) return error

    const existing = await db.kra.findUnique({ where: { id: data.id, orgId: g.ctx!.org.id } })
    if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })

    const kra = await db.kra.update({
      where: { id: data.id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.targetRating !== undefined && { targetRating: data.targetRating }),
        ...(data.selfRating !== undefined && { selfRating: data.selfRating }),
        ...(data.managerRating !== undefined && { managerRating: data.managerRating }),
        ...(data.selfComment !== undefined && { selfComment: data.selfComment }),
        ...(data.managerComment !== undefined && { managerComment: data.managerComment }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, designation: true } },
      },
    })

    // Notify user when their KRA is moved to manager_review (i.e. self-review done)
    if (data.status === 'manager_review' && existing.status !== 'manager_review') {
      const manager = await db.user.findUnique({ where: { id: kra.userId } })
      if (manager?.reportingManagerId) {
        await createNotification(g.ctx!.org.id, manager.reportingManagerId, {
          title: 'KRA review pending',
          body: `Self-review submitted for “${kra.title}” (${kra.cycle}). Your manager review is requested.`,
          category: 'kra',
          link: 'kra',
        })
      }
    }

    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'kra.updated', 'Kra', kra.id, {
      userId: kra.userId,
      status: kra.status,
    })
    return NextResponse.json({ kra })
  })
}

export async function DELETE(req: NextRequest) {
  return withErrors(async () => {
    const g = await requireModule('kra')
    if (g.response) return g.response

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'no_id' }, { status: 400 })
    await db.kra.delete({ where: { id, orgId: g.ctx!.org.id } })
    await audit(g.ctx!.org.id, g.ctx!.user?.id, 'kra.deleted', 'Kra', id)
    return NextResponse.json({ ok: true })
  })
}
