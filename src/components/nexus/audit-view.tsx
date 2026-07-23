'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { api, formatDate, initials } from '@/lib/api'

interface AuditLog {
  id: string
  action: string
  entityType: string
  entityId?: string | null
  metadata?: string | null
  createdAt: string
  actor?: { id: string; name: string; email: string } | null
}

const ACTION_ICON: Record<string, keyof typeof Icons> = {
  'org.created': 'Building2',
  'module.enabled': 'ToggleRight',
  'module.disabled': 'ToggleLeft',
  'onboarding.completed': 'Sparkles',
  'task.created': 'PlusCircle',
  'project.created': 'FolderPlus',
  'room.created': 'DoorOpen',
  'booking.created': 'CalendarPlus',
}

export function AuditView() {
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [filter, setFilter] = React.useState('')

  React.useEffect(() => {
    api<{ logs: AuditLog[] }>('/api/audit').then((d) => setLogs(d.logs)).catch(() => {})
  }, [])

  const filtered = logs.filter(
    (l) =>
      !filter ||
      l.action.toLowerCase().includes(filter.toLowerCase()) ||
      l.actor?.name.toLowerCase().includes(filter.toLowerCase()) ||
      l.entityType.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Who changed what, when. Last 100 events across all modules.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Event stream</CardTitle>
              <CardDescription>{filtered.length} events</CardDescription>
            </div>
            <Input
              placeholder="Filter by action, actor, entity…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
            {filtered.map((log) => {
              const iconName = ACTION_ICON[log.action] || 'Circle'
              const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[iconName] || Icons.Circle
              const meta = log.metadata ? (() => { try { return JSON.parse(log.metadata) } catch { return null } })() : null
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.action}</span>
                      <Badge variant="outline" className="text-[9px]">{log.entityType}</Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {log.actor ? (
                        <>
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">{initials(log.actor.name)}</AvatarFallback>
                          </Avatar>
                          <span>{log.actor.name}</span>
                        </>
                      ) : (
                        <span>System</span>
                      )}
                      <span>·</span>
                      <span>{formatDate(log.createdAt, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {meta && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {Object.entries(meta).slice(0, 3).map(([k, v]) => (
                          <span key={k} className="mr-3">
                            <span className="opacity-60">{k}:</span> <code className="rounded bg-muted px-1">{String(v)}</code>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No audit events.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
