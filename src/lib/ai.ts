import ZAI from 'z-ai-web-dev-sdk'

/**
 * AI integration (PRD §16).
 *
 * Per PRD v2.1, all AI features ship in the free/open-source core — not gated.
 *
 * Implemented candidates from PRD §16:
 *   - Natural-language task creation ("create a high-priority task for Anjali
 *     to ship the landing page by Friday")
 *   - Task summarization (summarize the description + recent activity of a task)
 *
 * Future candidates (scaffolded, not built):
 *   - Smart resource allocation suggestions
 *   - AI-assisted appraisal draft writing (M2)
 *   - Chat-based room booking
 *   - Budget anomaly detection
 *
 * Uses the z-ai-web-dev-sdk which auto-configures via `.z-ai-config` file
 * or env vars. Falls back gracefully if no API key is configured.
 */

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null

async function getZai() {
  if (zaiInstance) return zaiInstance
  try {
    zaiInstance = await ZAI.create()
    return zaiInstance
  } catch (err) {
    return null
  }
}

export interface ParsedTaskInput {
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  type?: 'task' | 'feature' | 'bug' | 'epic'
  assigneeName?: string
  dueDate?: string  // ISO 8601
  tags?: string[]
  confidence: 'high' | 'medium' | 'low'
  rawInterpretation: string
}

/**
 * Parse a natural-language task description into structured task fields.
 *
 * Example input: "create a high-priority bug for Vikram to fix the login
 * crash by Friday, tag it mobile and auth"
 */
export async function parseNaturalLanguageTask(input: string): Promise<ParsedTaskInput> {
  const zai = await getZai()
  if (!zai) {
    // Fallback: just use the input as the title
    return {
      title: input.slice(0, 200),
      confidence: 'low',
      rawInterpretation: 'AI not configured — using input as title verbatim.',
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = `You are a task parser for a project management tool. Convert the user's natural-language task description into a structured JSON object.

Today's date is ${today}. Resolve relative dates like "Friday", "next Monday", "tomorrow" to absolute ISO 8601 dates.

Return ONLY a JSON object with these fields:
{
  "title": string (concise, max 100 chars, action-oriented),
  "description": string (optional, expanded context if the input has detail),
  "priority": "low" | "medium" | "high" | "urgent" (default medium),
  "type": "task" | "feature" | "bug" | "epic" (default task; use "bug" for fix/crash/error/broken),
  "assigneeName": string (optional, the person's name if mentioned),
  "dueDate": string (ISO 8601 date, optional),
  "tags": string[] (optional, comma-or-space separated keywords),
  "confidence": "high" | "medium" | "low",
  "rawInterpretation": string (one-sentence summary of what you understood)
}

Do not include any other text. Just the JSON object.`

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.2,
    })
    const content = completion.choices[0]?.message?.content || ''
    // Extract JSON from the response (handle markdown code blocks too)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON in response')
    }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      title: parsed.title || input.slice(0, 100),
      description: parsed.description,
      priority: parsed.priority,
      type: parsed.type,
      assigneeName: parsed.assigneeName,
      dueDate: parsed.dueDate,
      tags: parsed.tags,
      confidence: parsed.confidence || 'medium',
      rawInterpretation: parsed.rawInterpretation || '',
    }
  } catch (err) {
    return {
      title: input.slice(0, 200),
      confidence: 'low',
      rawInterpretation: `AI parse failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }
}

/**
 * Summarize a task's activity for quick context.
 */
export async function summarizeTask(task: {
  title: string
  description?: string | null
  status: string
  priority: string
  type: string
  project?: { name: string } | null
  assignee?: { name: string } | null
  comments?: { body: string; author?: { name: string } | null; createdAt: string }[]
}): Promise<string> {
  const zai = await getZai()
  if (!zai) {
    return `**${task.title}** — ${task.status} · ${task.priority} priority · assigned to ${task.assignee?.name || 'unassigned'}.`
  }

  const taskInfo = `Title: ${task.title}
Description: ${task.description || '(none)'}
Status: ${task.status}
Priority: ${task.priority}
Type: ${task.type}
Project: ${task.project?.name || 'none'}
Assignee: ${task.assignee?.name || 'unassigned'}
Comments: ${task.comments?.length || 0}`

  const systemPrompt = `Summarize this task in 2-3 sentences for a team lead who needs quick context. Be specific about the status, who owns it, and what's blocking or next. Don't pad — just the essential facts.`

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: taskInfo },
      ],
      thinking: { type: 'disabled' },
      temperature: 0.3,
    })
    return completion.choices[0]?.message?.content?.trim() || taskInfo
  } catch (err) {
    return `**${task.title}** — ${task.status} · ${task.priority} priority. (AI summary unavailable)`
  }
}

/**
 * Detect potential anomalies in budget spend.
 * Simple heuristic + AI for the explanation.
 */
export async function detectBudgetAnomalies(
  expenses: Array<{ title: string; amount: number; category: string; incurredDate: string; vendor?: string | null }>,
  totalBudget: number,
  totalSpent: number
): Promise<Array<{ title: string; description: string; severity: 'info' | 'warning' | 'error' }>> {
  const anomalies: Array<{ title: string; description: string; severity: 'info' | 'warning' | 'error' }> = []

  // Heuristic 1: budget overruns
  if (totalBudget > 0 && totalSpent > totalBudget) {
    anomalies.push({
      title: 'Budget overrun',
      description: `Spent ₹${totalSpent.toLocaleString('en-IN')} of ₹${totalBudget.toLocaleString('en-IN')} budget (${Math.round((totalSpent / totalBudget) * 100)}% — over by ₹${(totalSpent - totalBudget).toLocaleString('en-IN')}).`,
      severity: 'error',
    })
  } else if (totalBudget > 0 && totalSpent / totalBudget > 0.85) {
    anomalies.push({
      title: 'Approaching budget limit',
      description: `${Math.round((totalSpent / totalBudget) * 100)}% of budget used. ₹${(totalBudget - totalSpent).toLocaleString('en-IN')} remaining.`,
      severity: 'warning',
    })
  }

  // Heuristic 2: unusually large single expense (> 30% of total spend)
  if (expenses.length > 3 && totalSpent > 0) {
    for (const e of expenses) {
      if (e.amount / totalSpent > 0.3) {
        anomalies.push({
          title: 'Large single expense',
          description: `"${e.title}" (${e.category}) is ₹${e.amount.toLocaleString('en-IN')} — ${Math.round((e.amount / totalSpent) * 100)}% of total spend. Worth reviewing.`,
          severity: 'warning',
        })
      }
    }
  }

  // Heuristic 3: vendor concentration
  const byVendor: Record<string, number> = {}
  for (const e of expenses) {
    if (e.vendor) byVendor[e.vendor] = (byVendor[e.vendor] || 0) + e.amount
  }
  for (const [vendor, total] of Object.entries(byVendor)) {
    if (totalSpent > 0 && total / totalSpent > 0.5 && Object.keys(byVendor).length > 2) {
      anomalies.push({
        title: 'Vendor concentration risk',
        description: `${vendor} accounts for ${Math.round((total / totalSpent) * 100)}% of total spend. Consider diversifying.`,
        severity: 'info',
      })
    }
  }

  // AI summary if available
  const zai = await getZai()
  if (zai && anomalies.length > 0) {
    try {
      const summary = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a financial controller reviewing expense anomalies. For each anomaly below, write a one-sentence actionable recommendation. Be specific and concise.',
          },
          {
            role: 'user',
            content: `Budget: ₹${totalBudget}, Spent: ₹${totalSpent}, Expenses: ${JSON.stringify(expenses.slice(0, 20))}\n\nAnomalies:\n${anomalies.map((a, i) => `${i + 1}. [${a.severity}] ${a.title}: ${a.description}`).join('\n')}`,
          },
        ],
        thinking: { type: 'disabled' },
        temperature: 0.4,
      })
      const rec = summary.choices[0]?.message?.content?.trim()
      if (rec) {
        anomalies.push({
          title: 'AI recommendation',
          description: rec,
          severity: 'info',
        })
      }
    } catch {
      // ignore AI failures
    }
  }

  return anomalies
}

/**
 * Check if AI is configured (used by UI to show/hide AI features).
 */
export async function isAIConfigured(): Promise<boolean> {
  const zai = await getZai()
  return zai !== null
}
