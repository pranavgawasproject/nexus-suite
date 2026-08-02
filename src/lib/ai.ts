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

/**
 * Generate AI-powered insights from the cross-module dashboard data.
 * Returns a list of actionable insights the team lead should know about.
 */
export async function generateDashboardInsights(data: {
  kpis: {
    totalTasks: number
    openTasks: number
    blockedTasks: number
    completionRate: number
    activeProjects: number
    totalRooms: number
    upcomingBookings: number
    teamSize: number
    pendingLeaves?: number
    onLeaveToday?: number
    overAllocated?: number
    krasPendingReview?: number
    totalBudget?: number
    totalSpent?: number
  }
  statusCounts: Record<string, number>
  priorityCounts: Record<string, number>
  workload: { name: string; open: number; done: number }[]
  bookingsPerRoom: { name: string; count: number }[]
}): Promise<{ insights: { title: string; description: string; severity: 'info' | 'warning' | 'error' }[] }> {
  const insights: { title: string; description: string; severity: 'info' | 'warning' | 'error' }[] = []

  // Heuristic: blocked tasks
  if (data.kpis.blockedTasks > 0) {
    insights.push({
      title: `${data.kpis.blockedTasks} blocked task${data.kpis.blockedTasks === 1 ? '' : 's'}`,
      description: `Blocked items need attention. Consider unblocking or escalating.`,
      severity: data.kpis.blockedTasks > 2 ? 'error' : 'warning',
    })
  }

  // Heuristic: completion rate
  if (data.kpis.completionRate < 25 && data.kpis.totalTasks > 5) {
    insights.push({
      title: 'Low completion rate',
      description: `Only ${data.kpis.completionRate}% of tasks are done. Team may be overloaded or blocked.`,
      severity: 'warning',
    })
  } else if (data.kpis.completionRate > 80) {
    insights.push({
      title: 'High completion rate',
      description: `${data.kpis.completionRate}% of tasks done — great momentum!`,
      severity: 'info',
    })
  }

  // Heuristic: over-allocated team members
  if (data.kpis.overAllocated && data.kpis.overAllocated > 0) {
    insights.push({
      title: `${data.kpis.overAllocated} over-allocated team member${data.kpis.overAllocated === 1 ? '' : 's'}`,
      description: `Rebalance workload to prevent burnout. Check Resource module.`,
      severity: 'warning',
    })
  }

  // Heuristic: pending leave approvals
  if (data.kpis.pendingLeaves && data.kpis.pendingLeaves > 2) {
    insights.push({
      title: `${data.kpis.pendingLeaves} pending leave requests`,
      description: `Approve or reject pending leaves to avoid blocking team planning.`,
      severity: 'info',
    })
  }

  // Heuristic: KRA reviews pending
  if (data.kpis.krasPendingReview && data.kpis.krasPendingReview > 0) {
    insights.push({
      title: `${data.kpis.krasPendingReview} KRA${data.kpis.krasPendingReview === 1 ? '' : 's'} pending manager review`,
      description: `Team members are waiting on performance review feedback.`,
      severity: 'info',
    })
  }

  // Heuristic: budget burn
  if (data.kpis.totalBudget && data.kpis.totalSpent !== undefined && data.kpis.totalBudget > 0) {
    const pct = (data.kpis.totalSpent / data.kpis.totalBudget) * 100
    if (pct > 90) {
      insights.push({
        title: 'Budget nearly exhausted',
        description: `${Math.round(pct)}% of total budget spent (₹${data.kpis.totalSpent.toLocaleString('en-IN')} of ₹${data.kpis.totalBudget.toLocaleString('en-IN')}).`,
        severity: 'error',
      })
    } else if (pct > 75) {
      insights.push({
        title: 'Approaching budget limit',
        description: `${Math.round(pct)}% of budget used. Review upcoming expenses.`,
        severity: 'warning',
      })
    }
  }

  // Heuristic: workload imbalance
  if (data.workload.length > 0) {
    const openTasks = data.workload.map((w) => w.open)
    const max = Math.max(...openTasks)
    const avg = openTasks.reduce((a, b) => a + b, 0) / openTasks.length
    if (max > avg * 2 && max > 3) {
      const overloaded = data.workload.find((w) => w.open === max)
      insights.push({
        title: 'Workload imbalance detected',
        description: `${overloaded?.name} has ${max} open tasks vs team average of ${Math.round(avg)}. Consider redistributing.`,
        severity: 'warning',
      })
    }
  }

  // AI-powered summary (if configured)
  const zai = await getZai()
  if (zai && insights.length > 0) {
    try {
      const summary = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a project management analyst. Given the dashboard data and heuristic insights below, write a single 2-sentence executive summary highlighting the most urgent thing the team lead should act on today. Be specific and concise.',
          },
          {
            role: 'user',
            content: `KPIs: ${JSON.stringify(data.kpis)}\n\nInsights:\n${insights.map((i, idx) => `${idx + 1}. [${i.severity}] ${i.title}: ${i.description}`).join('\n')}`,
          },
        ],
        thinking: { type: 'disabled' },
        temperature: 0.4,
      })
      const summaryText = summary.choices[0]?.message?.content?.trim()
      if (summaryText) {
        insights.unshift({
          title: 'AI executive summary',
          description: summaryText,
          severity: 'info',
        })
      }
    } catch {
      // ignore AI failures — heuristics alone are still useful
    }
  }

  return { insights }
}

/**
 * AI copilot for admins — governance/compliance checks + KPI suggestions.
 * Reviews org policies and configuration, returns actionable recommendations.
 */
export async function runAdminCopilot(opts: {
  policies: { type: string; name: string; active: boolean; config: Record<string, unknown> }[]
  orgStats: {
    usersCount: number
    apiKeysCount: number
    webhooksCount: number
    modulesEnabled: string[]
    auditLogsCount: number
  }
}): Promise<{ recommendations: { title: string; description: string; priority: 'high' | 'medium' | 'low'; category: string }[] }> {
  const recs: { title: string; description: string; priority: 'high' | 'medium' | 'low'; category: string }[] = []

  // Policy checks
  const retention = opts.policies.find((p) => p.type === 'retention')
  if (!retention || !retention.active) {
    recs.push({
      title: 'Enable data retention policy',
      description: 'No active data retention policy. Set one to comply with GDPR/privacy regulations — recommends keeping audit logs for 365 days.',
      priority: 'high',
      category: 'compliance',
    })
  }

  const password = opts.policies.find((p) => p.type === 'password')
  if (!password || !password.active) {
    recs.push({
      title: 'Enable password policy',
      description: 'No active password policy. Enforce minimum length 12 + special chars + rotation to harden auth.',
      priority: 'high',
      category: 'security',
    })
  } else {
    const minLen = (password.config?.minLength as number) || 0
    if (minLen < 12) {
      recs.push({
        title: 'Strengthen password policy',
        description: `Current min length is ${minLen}. NIST recommends ≥12 characters.`,
        priority: 'medium',
        category: 'security',
      })
    }
  }

  const ipAllow = opts.policies.find((p) => p.type === 'ip_allowlist')
  if (!ipAllow || !ipAllow.active) {
    recs.push({
      title: 'Consider IP allowlisting for API',
      description: 'No IP allowlist active. For production deployments, restrict API access to known CIDR ranges.',
      priority: 'low',
      category: 'security',
    })
  }

  // API key hygiene
  if (opts.orgStats.apiKeysCount > 5) {
    recs.push({
      title: 'Review API key inventory',
      description: `${opts.orgStats.apiKeysCount} API keys exist. Audit for unused keys and revoke them.`,
      priority: 'medium',
      category: 'hygiene',
    })
  }

  // Webhook health
  if (opts.orgStats.webhooksCount === 0 && opts.orgStats.apiKeysCount > 0) {
    recs.push({
      title: 'No webhooks configured',
      description: 'API keys exist but no webhooks. Set up webhooks for event-driven integrations instead of polling.',
      priority: 'low',
      category: 'integration',
    })
  }

  // Module adoption
  if (opts.orgStats.modulesEnabled.length < 3) {
    recs.push({
      title: 'Low module adoption',
      description: `Only ${opts.orgStats.modulesEnabled.length} module(s) enabled. Explore the Module Marketplace for more value.`,
      priority: 'low',
      category: 'adoption',
    })
  }

  // SSO enforcement for larger orgs
  if (opts.orgStats.usersCount > 20) {
    const sso = opts.policies.find((p) => p.type === 'sso_enforcement')
    if (!sso || !sso.active) {
      recs.push({
        title: 'Enforce SSO for larger org',
        description: `${opts.orgStats.usersCount} users — consider enforcing SAML/OIDC SSO to centralize auth and reduce password fatigue.`,
        priority: 'medium',
        category: 'security',
      })
    }
  }

  // AI-powered prioritization
  const zai = await getZai()
  if (zai && recs.length > 0) {
    try {
      const aiResp = await zai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a security/compliance auditor. Given the recommendations below, pick the TOP 3 most urgent and explain in one sentence each why they matter. Return as a numbered list.',
          },
          {
            role: 'user',
            content: recs.map((r, i) => `${i + 1}. [${r.priority}] ${r.title}: ${r.description}`).join('\n'),
          },
        ],
        thinking: { type: 'disabled' },
        temperature: 0.3,
      })
      const top3 = aiResp.choices[0]?.message?.content?.trim()
      if (top3) {
        recs.unshift({
          title: 'AI top 3 priorities',
          description: top3,
          priority: 'high',
          category: 'ai',
        })
      }
    } catch {
      // ignore
    }
  }

  return { recommendations: recs }
}
