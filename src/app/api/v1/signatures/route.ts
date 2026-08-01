import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requirePublicApi, parsePublicBody, apiOk, apiError } from '@/lib/public-api'
import { createPublicSignatureSchema } from '@/lib/schemas'
import { emitEvent } from '@/lib/webhooks'

/**
 * Public API — Signatures (Module 10 Governance & Compliance).
 * GET list (read), POST create signature request (write).
 * Module-gated via requirePublicApi('governance').
 */

// GET /api/v1/signatures?documentType=&documentId=&status=&limit=
export async function GET(req: NextRequest) {
  const g = await requirePublicApi(req, 'governance')
  if (g.response) return g.response

  const { searchParams } = new URL(req.url)
  const documentType = searchParams.get('documentType')
  const documentId = searchParams.get('documentId')
  const status = searchParams.get('status')
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50') || 50))

  const signatures = await db.signature.findMany({
    where: {
      orgId: g.ctx!.orgId,
      ...(documentType ? { documentType } : {}),
      ...(documentId ? { documentId } : {}),
      ...(status && status !== 'all' ? { status } : {}),
    },
    select: {
      id: true,
      documentType: true,
      documentId: true,
      signerId: true,
      signerEmail: true,
      status: true,
      signedAt: true,
      signatureHash: true,
      expiresAt: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'desc' }],
    take: limit,
  })

  return apiOk({ signatures })
}

// POST /api/v1/signatures — create a signature request (write scope)
// Body: { documentType, documentId, signerId, signerEmail, expiresAt? }
export async function POST(req: NextRequest) {
  const g = await requirePublicApi(req, 'governance', { scope: 'write' })
  if (g.response) return g.response

  const { data, error } = await parsePublicBody(req, createPublicSignatureSchema)
  if (error) return error
  if (!data) return apiError('No data', 'invalid_json', 400)

  // Validate signer belongs to org
  const signer = await db.user.findFirst({
    where: { id: data.signerId, orgId: g.ctx!.orgId },
    select: { id: true, email: true, name: true },
  })
  if (!signer) {
    return apiError('Signer user not found in your org', 'not_found', 404)
  }

  const signature = await db.signature.create({
    data: {
      orgId: g.ctx!.orgId,
      documentType: data.documentType,
      documentId: data.documentId,
      signerId: data.signerId,
      signerEmail: data.signerEmail,
      status: 'pending',
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    },
    select: {
      id: true,
      documentType: true,
      documentId: true,
      signerId: true,
      signerEmail: true,
      status: true,
      signedAt: true,
      signatureHash: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  await emitEvent(g.ctx!.orgId, 'signature.created', {
    signature: {
      id: signature.id,
      documentType: signature.documentType,
      documentId: signature.documentId,
      signerId: signature.signerId,
      signerEmail: signature.signerEmail,
      status: signature.status,
    },
  })

  return apiOk({ signature }, 201)
}
