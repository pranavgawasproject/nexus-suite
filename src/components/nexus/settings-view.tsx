'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { MODULE_REGISTRY, type ModuleKey } from '@/lib/modules'
import { cn } from '@/lib/utils'

export function SettingsView() {
  const { modules, toggleModule, org } = useAppStore()
  const [pending, setPending] = React.useState<ModuleKey | null>(null)
  const [pendingState, setPendingState] = React.useState<'active' | 'disabled' | 'trial' | null>(null)

  const moduleState = (key: ModuleKey) => modules.find((m) => m.moduleKey === key)?.state || 'disabled'

  const requestToggle = (key: ModuleKey, currentState: string) => {
    const next = currentState === 'disabled' ? 'active' : 'disabled'
    setPending(key)
    setPendingState(next)
  }

  const confirm = async () => {
    if (!pending || !pendingState) return
    try {
      await toggleModule(pending, pendingState)
      const def = MODULE_REGISTRY.find((m) => m.key === pending)
      toast.success(
        pendingState === 'disabled'
          ? `${def?.shortName} disabled`
          : `${def?.shortName} enabled`,
        {
          description: pendingState === 'disabled'
            ? 'Data is preserved; module is hidden across the app.'
            : 'Module is now visible in the sidebar.',
        }
      )
    } catch {
      toast.error('Failed to toggle module')
    } finally {
      setPending(null)
      setPendingState(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Module Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Toggle modules on or off. Disabled modules preserve their data but are hidden everywhere.
          You&apos;re on the <Badge variant="outline" className="capitalize">{org?.plan}</Badge> plan.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {MODULE_REGISTRY.map((m) => {
          const state = moduleState(m.key)
          const Icon = (Icons as never)[m.icon] as Icons.LucideIcon
          const enabled = state === 'active' || state === 'trial'
          return (
            <Card key={m.key} className={cn('relative overflow-hidden', !enabled && 'opacity-90')}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg text-white shadow-sm', m.color)}>
                    {Icon && <Icon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{m.shortName}</CardTitle>
                      <Badge variant="outline" className="text-[9px] capitalize">{m.tier}</Badge>
                      <Badge variant="secondary" className="text-[9px]">Phase {m.phase}</Badge>
                      {state === 'trial' && (
                        <Badge className="text-[9px] bg-amber-500">Trial</Badge>
                      )}
                      {state === 'archived' && (
                        <Badge variant="secondary" className="text-[9px]">Archived</Badge>
                      )}
                    </div>
                    <CardDescription className="mt-1 line-clamp-2">{m.description}</CardDescription>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={() => requestToggle(m.key, state)}
                    aria-label={`Toggle ${m.name}`}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Status:{' '}
                    <span className={cn(
                      'font-medium capitalize',
                      enabled ? 'text-emerald-600' : 'text-muted-foreground'
                    )}>
                      {state}
                    </span>
                  </span>
                  {enabled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => useAppStore.getState().setActiveView(m.key as never)}
                    >
                      Open module <Icons.ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pricing reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing tiers</CardTitle>
          <CardDescription>Toggle-based — pay only for what you use.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { tier: 'Starter', price: '₹0', includes: 'Core + Tasks · 10 users · 14-day trial of 1 module' },
              { tier: 'Growth', price: '₹299/u/mo', includes: 'Core + any 3 modules + basic Reporting' },
              { tier: 'Business', price: '₹599/u/mo', includes: 'Core + any 6 modules + advanced BI' },
              { tier: 'Enterprise', price: 'Custom', includes: 'All modules + Governance + SSO + SLA' },
            ].map((p) => (
              <div key={p.tier} className="rounded-lg border bg-card p-3">
                <div className="text-xs text-muted-foreground">{p.tier}</div>
                <div className="text-lg font-bold">{p.price}</div>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed">{p.includes}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>
              {pendingState === 'disabled' ? 'Disable module?' : 'Enable module?'}
            </DialogTitle>
            <DialogDescription>
              {pendingState === 'disabled'
                ? 'The module will be hidden from the sidebar and all users. Existing data (tasks, bookings, etc.) is preserved and will reappear when you re-enable.'
                : 'The module will appear in the sidebar and be available to all users in your organization. You can disable it anytime.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPending(null)}>Cancel</Button>
            <Button onClick={confirm} variant={pendingState === 'disabled' ? 'destructive' : 'default'}>
              {pendingState === 'disabled' ? 'Disable' : 'Enable'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
