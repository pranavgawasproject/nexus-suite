'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { api, formatDate, relativeTime } from '@/lib/api'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string
  lastUsedAt?: string | null
  expiresAt?: string | null
  createdAt: string
}
interface Webhook {
  id: string
  url: string
  events: string
  active: boolean
  lastResponseCode?: number | null
  lastSuccessAt?: string | null
  lastFailureAt?: string | null
  failureCount: number
  pendingDeliveries: number
  secretPrefix: string
  createdAt: string
}

export function ApiKeysView() {
  const [tab, setTab] = React.useState<'keys' | 'webhooks'>('keys')
  const [keys, setKeys] = React.useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([])
  const [createKeyOpen, setCreateKeyOpen] = React.useState(false)
  const [createHookOpen, setCreateHookOpen] = React.useState(false)
  const [newKey, setNewKey] = React.useState<string | null>(null)
  const [newSecret, setNewSecret] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    try {
      const [k, w] = await Promise.all([
        api<{ apiKeys: ApiKey[] }>('/api/api-keys'),
        api<{ webhooks: Webhook[] }>('/api/webhooks'),
      ])
      setKeys(k.apiKeys); setWebhooks(w.webhooks)
    } catch {}
  }, [])
  React.useEffect(() => { load() }, [load])

  const revokeKey = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return
    try { await api(`/api/api-keys?id=${id}`, { method: 'DELETE' }); toast.success('Key revoked'); load() }
    catch { toast.error('Failed') }
  }
  const deleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return
    try { await api(`/api/webhooks?id=${id}`, { method: 'DELETE' }); toast.success('Webhook deleted'); load() }
    catch { toast.error('Failed') }
  }
  const toggleWebhook = async (id: string, active: boolean) => {
    // Toggle via re-create-then-delete pattern would be needed; for MVP, just toggle active flag
    // Since we don't have a PATCH for active, we'll skip; the UI shows current state
    toast.info('Toggle API coming soon')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys &amp; Webhooks</h1>
        <p className="text-sm text-muted-foreground">
          Programmatic access to your Nexus Suite org. See the{' '}
          <a href="/docs/api" className="text-emerald-600 hover:underline">API docs</a> for endpoints.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="keys">API Keys ({keys.length})</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks ({webhooks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">API Keys</CardTitle>
                <CardDescription>Authenticate requests to /api/v1/*</CardDescription>
              </div>
              <CreateKeyDialog open={createKeyOpen} onOpenChange={setCreateKeyOpen} onCreated={(key) => {
                setNewKey(key); load()
              }} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {keys.map((k) => (
                  <div key={k.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                      <Icons.KeyRound className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{k.name}</span>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{k.keyPrefix}…</code>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Scopes: {k.scopes} · Last used {k.lastUsedAt ? relativeTime(k.lastUsedAt) : 'never'} · Created {formatDate(k.createdAt, { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {k.scopes.split(',').map((s) => (
                        <Badge key={s} variant="outline" className="text-[10px] capitalize">{s.trim()}</Badge>
                      ))}
                    </div>
                    <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => revokeKey(k.id)}>
                      <Icons.Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {keys.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">No API keys yet. Create one to start using the public API.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Demo key info box */}
          <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-900/50">
            <CardContent className="flex items-start gap-3 p-4">
              <Icons.Sparkles className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div className="text-sm font-semibold">Try the API instantly</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  A demo key is auto-provisioned for the demo org so you can test the public API immediately:
                  <code className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px]">nexus_nexus_demo_key_please_rotate_in_production</code>
                </div>
                <div className="mt-2 text-xs">
                  Try: <code className="rounded bg-muted px-1.5 py-0.5 text-[11px]">curl -H "Authorization: Bearer nexus_nexus_demo_key_please_rotate_in_production" http://localhost:3000/api/v1/me</code>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Webhooks</CardTitle>
                <CardDescription>HMAC-signed event delivery to your endpoints</CardDescription>
              </div>
              <CreateWebhookDialog open={createHookOpen} onOpenChange={setCreateHookOpen} onCreated={(secret) => {
                setNewSecret(secret); load()
              }} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {webhooks.map((w) => (
                  <div key={w.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <Icons.Webhook className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium font-mono">{w.url}</span>
                        <Badge variant="outline" className="text-[10px]">{w.secretPrefix}</Badge>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        Events: <code>{w.events}</code> · {w.pendingDeliveries} pending · Last success {w.lastSuccessAt ? relativeTime(w.lastSuccessAt) : 'never'}
                        {w.failureCount > 0 && <span className="text-rose-600"> · {w.failureCount} failures</span>}
                      </div>
                    </div>
                    <Switch checked={w.active} onCheckedChange={(v) => toggleWebhook(w.id, v)} disabled />
                    <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => deleteWebhook(w.id)}>
                      <Icons.Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
                {webhooks.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No webhooks configured. Create one to receive event notifications.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Webhook events</CardTitle>
              <CardDescription>Subscribe to any of these events (or use <code>*</code> for all)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  'task.created', 'task.updated', 'task.deleted',
                  'booking.confirmed', 'booking.cancelled',
                  'leave.created', 'leave.approved', 'leave.rejected',
                  'kra.created', 'kra.updated',
                  'expense.created', 'budget.upserted',
                  'document.created', 'document.updated',
                ].map((e) => (
                  <code key={e} className="rounded border bg-muted/40 px-2 py-1 text-xs">{e}</code>
                ))}
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Tip: use a prefix like <code>task.*</code> to subscribe to all task events.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New key reveal dialog */}
      {newKey && (
        <Dialog open={!!newKey} onOpenChange={(o) => !o && setNewKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API key created</DialogTitle>
              <DialogDescription>Copy this key now — it will not be shown again.</DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{newKey}</div>
            <DialogFooter>
              <Button onClick={() => { navigator.clipboard.writeText(newKey); toast.success('Copied') }}>
                <Icons.Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
              <Button variant="outline" onClick={() => setNewKey(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {newSecret && (
        <Dialog open={!!newSecret} onOpenChange={(o) => !o && setNewSecret(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Webhook signing secret</DialogTitle>
              <DialogDescription>Use this to verify the X-Nexus-Signature header on incoming webhooks.</DialogDescription>
            </DialogHeader>
            <div className="rounded-md bg-muted p-3 font-mono text-xs break-all">{newSecret}</div>
            <DialogFooter>
              <Button onClick={() => { navigator.clipboard.writeText(newSecret); toast.success('Copied') }}>
                <Icons.Copy className="mr-2 h-3.5 w-3.5" /> Copy
              </Button>
              <Button variant="outline" onClick={() => setNewSecret(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function CreateKeyDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (key: string) => void }) {
  const [name, setName] = React.useState('')
  const [scopes, setScopes] = React.useState<string[]>(['read'])
  const [submitting, setSubmitting] = React.useState(false)

  const toggleScope = (s: string) => setScopes((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s])

  const submit = async () => {
    if (!name.trim()) { toast.error('Name required'); return }
    setSubmitting(true)
    try {
      const { key } = await api<{ key: string }>('/api/api-keys', {
        method: 'POST', body: JSON.stringify({ name: name.trim(), scopes: scopes.join(',') })
      })
      setName(''); setScopes(['read'])
      onOpenChange(false); onCreated(key)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5">New key</span></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>Grant programmatic access to your Nexus Suite org.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="kn">Name *</Label>
            <Input id="kn" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Slack integration" autoFocus />
          </div>
          <div>
            <Label>Scopes</Label>
            <div className="mt-2 space-y-2">
              {['read', 'write', 'webhooks'].map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={scopes.includes(s)} onChange={() => toggleScope(s)} className="rounded" />
                  <span className="capitalize">{s}</span>
                  <span className="text-xs text-muted-foreground">
                    {s === 'read' && '— read access to all endpoints'}
                    {s === 'write' && '— create/update/delete'}
                    {s === 'webhooks' && '— manage webhooks'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateWebhookDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: (secret: string) => void }) {
  const [url, setUrl] = React.useState('')
  const [events, setEvents] = React.useState('*')
  const [submitting, setSubmitting] = React.useState(false)

  const submit = async () => {
    if (!url.trim() || !url.startsWith('http')) { toast.error('Valid URL required'); return }
    setSubmitting(true)
    try {
      const { secret } = await api<{ secret: string }>('/api/webhooks', {
        method: 'POST', body: JSON.stringify({ url: url.trim(), events })
      })
      setUrl(''); setEvents('*')
      onOpenChange(false); onCreated(secret)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
    finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5">New webhook</span></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create webhook</DialogTitle>
          <DialogDescription>Receive HMAC-signed event payloads at your endpoint.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="wu">Endpoint URL *</Label>
            <Input id="wu" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://your-app.com/webhooks/nexus" autoFocus />
          </div>
          <div>
            <Label htmlFor="we">Events</Label>
            <Input id="we" value={events} onChange={(e) => setEvents(e.target.value)} placeholder="* or task.*,booking.confirmed" />
            <div className="mt-1 text-xs text-muted-foreground">
              Use <code>*</code> for all, <code>task.*</code> for prefix match, or comma-separated list.
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create webhook</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
