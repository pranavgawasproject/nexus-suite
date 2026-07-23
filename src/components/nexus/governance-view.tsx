'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Policy {
  id: string
  type: string
  name: string
  config: Record<string, unknown>
  active: boolean
  updatedAt: string
  updatedBy?: { name: string } | null
}

const POLICY_META: Record<string, { name: string; description: string; icon: string; fields: { key: string; label: string; type: 'number' | 'text' | 'textarea' | 'list'; placeholder?: string }[] }> = {
  retention: {
    name: 'Data Retention',
    description: 'How long to keep audit logs and other org data before automatic deletion.',
    icon: 'Clock',
    fields: [
      { key: 'auditLogDays', label: 'Audit log retention (days)', type: 'number', placeholder: '365' },
      { key: 'notificationDays', label: 'Notification retention (days)', type: 'number', placeholder: '90' },
      { key: 'autoPurge', label: 'Auto-purge expired data?', type: 'text', placeholder: 'true' },
    ],
  },
  ip_allowlist: {
    name: 'IP Allowlisting',
    description: 'Restrict API and admin access to specific IP ranges (CIDR notation).',
    icon: 'ShieldCheck',
    fields: [
      { key: 'allowlist', label: 'Allowed CIDR ranges (comma-separated)', type: 'textarea', placeholder: '10.0.0.0/8, 192.168.1.0/24' },
      { key: 'enforceForApi', label: 'Enforce for public API?', type: 'text', placeholder: 'true' },
    ],
  },
  sso_enforcement: {
    name: 'SSO Enforcement',
    description: 'Require SAML/OIDC SSO for all users (disables password login).',
    icon: 'KeyRound',
    fields: [
      { key: 'provider', label: 'SSO provider', type: 'text', placeholder: 'okta | azuread | google' },
      { key: 'enforce', label: 'Enforce SSO for all users?', type: 'text', placeholder: 'false' },
      { key: 'exemptAdmins', label: 'Exempt admins from SSO?', type: 'text', placeholder: 'true' },
    ],
  },
  data_residency: {
    name: 'Data Residency',
    description: 'Pin data storage to a specific region (managed-hosting only).',
    icon: 'Globe',
    fields: [
      { key: 'region', label: 'Region', type: 'text', placeholder: 'in | eu | us' },
      { key: 'backupRegion', label: 'Backup region', type: 'text', placeholder: 'in' },
    ],
  },
  password: {
    name: 'Password Policy',
    description: 'Enforce password complexity and rotation rules.',
    icon: 'Lock',
    fields: [
      { key: 'minLength', label: 'Minimum length', type: 'number', placeholder: '12' },
      { key: 'requireSpecial', label: 'Require special characters?', type: 'text', placeholder: 'true' },
      { key: 'requireNumbers', label: 'Require numbers?', type: 'text', placeholder: 'true' },
      { key: 'rotationDays', label: 'Rotation period (days, 0 = never)', type: 'number', placeholder: '90' },
    ],
  },
}

export function GovernanceView() {
  const { isModuleOn, setActiveView } = useAppStore()
  const [policies, setPolicies] = React.useState<Policy[]>([])

  const load = React.useCallback(async () => {
    try {
      const d = await api<{ policies: Policy[] }>('/api/policies')
      setPolicies(d.policies)
    } catch {}
  }, [])
  React.useEffect(() => { if (isModuleOn('governance')) load() }, [load, isModuleOn])

  if (!isModuleOn('governance')) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icons.Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Governance is disabled</h3>
          <Button className="mt-4" onClick={() => setActiveView('settings')}><Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace</Button>
        </CardContent>
      </Card>
    )
  }

  const exportAudit = (format: 'csv' | 'json') => {
    window.open(`/api/audit/export?format=${format}`, '_blank')
    toast.success(`Audit log export (${format.toUpperCase()}) started`)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Governance, Compliance &amp; Audit</h1>
        <p className="text-sm text-muted-foreground">
          100% free and open-source per PRD v2.1 — not Enterprise-gated.
        </p>
      </div>

      {/* Audit export banner */}
      <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-900/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Icons.FileDown className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold">SOC2/ISO-ready audit log export</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Export every audit event with actor + entity + metadata for compliance evidence repositories (Vanta, Drata, etc.).
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => exportAudit('csv')}><Icons.FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> CSV</Button>
            <Button size="sm" variant="outline" onClick={() => exportAudit('json')}><Icons.FileJson className="mr-1 h-3.5 w-3.5" /> JSON</Button>
          </div>
        </CardContent>
      </Card>

      {/* Policy cards */}
      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(POLICY_META).map(([type, meta]) => (
          <PolicyCard key={type} type={type} meta={meta} policy={policies.find((p) => p.type === type)} onSaved={load} />
        ))}
      </div>
    </div>
  )
}

function PolicyCard({
  type,
  meta,
  policy,
  onSaved,
}: {
  type: string
  meta: typeof POLICY_META[string]
  policy?: Policy
  onSaved: () => void
}) {
  const [config, setConfig] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    meta.fields.forEach((f) => {
      const v = policy?.config?.[f.key]
      initial[f.key] = v !== undefined ? String(v) : f.placeholder || ''
    })
    return initial
  })
  const [active, setActive] = React.useState(policy?.active ?? false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const initial: Record<string, string> = {}
    meta.fields.forEach((f) => {
      const v = policy?.config?.[f.key]
      initial[f.key] = v !== undefined ? String(v) : f.placeholder || ''
    })
    setConfig(initial)
    setActive(policy?.active ?? false)
  }, [policy, meta])

  const Icon = (Icons as never)[meta.icon] as Icons.LucideIcon

  const save = async () => {
    setSaving(true)
    try {
      // Convert string values to typed config
      const configObj: Record<string, unknown> = {}
      meta.fields.forEach((f) => {
        const v = config[f.key]
        if (f.type === 'number') configObj[f.key] = v ? Number(v) : 0
        else if (v === 'true' || v === 'false') configObj[f.key] = v === 'true'
        else if (f.type === 'list') configObj[f.key] = v.split(',').map((s) => s.trim()).filter(Boolean)
        else configObj[f.key] = v
      })
      await api('/api/policies', {
        method: 'POST',
        body: JSON.stringify({ type, name: meta.name, config: configObj, active }),
      })
      toast.success(`${meta.name} policy saved`)
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg',
            active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-muted text-muted-foreground')}>
            {Icon && <Icon className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{meta.name}</CardTitle>
              {policy ? (
                <Badge variant={active ? 'default' : 'outline'} className="text-[10px]">{active ? 'Active' : 'Inactive'}</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">Not configured</Badge>
              )}
            </div>
            <CardDescription className="mt-1">{meta.description}</CardDescription>
          </div>
          <Switch checked={active} onCheckedChange={setActive} aria-label={`Enable ${meta.name}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {meta.fields.map((f) => (
          <div key={f.key}>
            <Label htmlFor={`${type}-${f.key}`} className="text-xs">{f.label}</Label>
            {f.type === 'textarea' ? (
              <Textarea
                id={`${type}-${f.key}`}
                value={config[f.key] || ''}
                onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                rows={2}
                placeholder={f.placeholder}
                className="mt-1 text-xs font-mono"
              />
            ) : (
              <Input
                id={`${type}-${f.key}`}
                type={f.type === 'number' ? 'number' : 'text'}
                value={config[f.key] || ''}
                onChange={(e) => setConfig({ ...config, [f.key]: e.target.value })}
                placeholder={f.placeholder}
                className="mt-1 text-sm"
              />
            )}
          </div>
        ))}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[10px] text-muted-foreground">
            {policy ? `Last updated ${formatDate(policy.updatedAt, { day: '2-digit', month: 'short', year: 'numeric' })} by ${policy.updatedBy?.name || 'system'}` : 'Never saved'}
          </div>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Icons.Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Save policy
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
