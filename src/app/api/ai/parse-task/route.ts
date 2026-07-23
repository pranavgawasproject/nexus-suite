import { NextRequest, NextResponse } from 'next/server'
import { withErrors, parseBody } from '@/lib/api-guard'
import { parseNaturalLanguageTask } from '@/lib/ai'
import { z } from 'zod'

const schema = z.object({
  input: z.string().min(1, 'Input is required').max(500),
})

export async function POST(req: NextRequest) {
  return withErrors(async () => {
    const { data, error } = await parseBody(req, schema)
    if (error) return error

    const result = await parseNaturalLanguageTask(data.input)
    return NextResponse.json({ parsed: result })
  })
}
