'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

interface TeamUser {
  id: string
  name: string
  email: string
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
  'leave.approved': 'CheckCircle',
  'leave.rejected': 'XCircle',
  'leave.cancelled': 'Ban',
}

const COMMON_ACTIONS = [
  'task.created',
  'task.updated',
  'project.created',
  'booking.created',
  'leave.approved',
  'leave.rejected',
  'module.enabled',
  'module.disabled',
  'org.created',
  'onboarding.completed',
]

const COMMON_ENTITY_TYPES = [
  'Task',
  'Project',
  'Booking',
  'Leave',
  'Room',
  'Budget',
  'Module',
  'Org',
  'User',
  'Document',
]

export function AuditView() {
  const [logs, setLogs] = React.useState<AuditLog[]>([])
  const [team, setTeam] = React.useState<TeamUser[]>([])
  const [loading, setLoading] = React.useState(true)
  const [textFilter, setTextFilter] = React.useState('')

  // Server-side filters (wired to GET /api/audit)
  const [fromDate, setFromDate] = React.useState('')
  const [toDate, setToDate] = React.useState('')
  const [actorId, setActorId] = React.useState<string>('')
  const [action, setAction] = React.useState<string>('')
  const [entityType, setEntityType] = React.useState<string>('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fromDate) params.set('from', new Date(fromDate + 'T00:00:00').toISOString())
      if (toDate) params.set('to', new Date(toDate + 'T23:59:59.999').toISOString())
      if (actorId) params.set('actorId', actorId)
      if (action) params.set('action', action)
      if (entityType) params.set('entityType', entityType)
      params.set('limit', '100')

      const qs = params.toString()
      const [auditRes, teamRes] = await Promise.all([
        api<{ logs: AuditLog[] }>(`/api/audit${qs ? `?${qs}` : ''}`),
        team.length === 0
          ? api<{ team: TeamUser[] }>('/api/team').catch(() => ({ team: [] as TeamUser[] }))
          : Promise.resolve({ team }),
      ])
      setLogs(auditRes.logs)
      if (team.length === 0 && teamRes.team) setTeam(teamRes.team)
    } catch {
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate, actorId, action, entityType, team.length])

  React.useEffect(() => {
    load()
  }, [load])

  const clearFilters = () => {
    setFromDate('')
    setToDate('')
    setActorId('')
    setAction('')
    setEntityType('')
    setTextFilter('')
  }

  const hasServerFilters = Boolean(fromDate || toDate || actorId || action || entityType)

  const filtered = logs.filter(
    (l) =>
      !textFilter ||
      l.action.toLowerCase().includes(textFilter.toLowerCase()) ||
      l.actor?.name.toLowerCase().includes(textFilter.toLowerCase()) ||
      l.entityType.toLowerCase().includes(textFilter.toLowerCase())
  )

  const actionOptions = React.useMemo(() => {
    const set = new Set(COMMON_ACTIONS)
    logs.forEach((l) => set.add(l.action))
    return Array.from(set).sort()
  }, [logs])

  const entityOptions = React.useMemo(() => {
    const set = new Set(COMMON_ENTITY_TYPES)
    logs.forEach((l) => set.add(l.entityType))
    return Array.from(set).sort()
  }, [logs])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Who changed what, when. Filter by date range, actor, action, or entity type.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="audit-from" className="text-xs text-muted-foreground">
                From
              </Label>
              <Input
                id="audit-from"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="audit-to" className="text-xs text-muted-foreground">
                To
              </Label>
              <Input
                id="audit-to"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Actor</Label>
              <Select
                value={actorId || '__all__'}
                onValueChange={(v) => setActorId(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All actors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All actors</SelectItem>
                  {team.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Action</Label>
              <Select
                value={action || '__all__'}
                onValueChange={(v) => setAction(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All actions</SelectItem>
                  {actionOptions.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Entity</Label>
              <Select
                value={entityType || '__all__'}
                onValueChange={(v) => setEntityType(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All entities</SelectItem>
                  {entityOptions.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(hasServerFilters || textFilter) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mb-0.5">
                <Icons.X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Event stream</CardTitle>
              <CardDescription>
                {loading ? 'Loading…' : `${filtered.length} event${filtered.length === 1 ? '' : 's'}`}
                {hasServerFilters ? ' (filtered)' : ''} · last 100 matching
              </CardDescription>
            </div>
            <Input
              placeholder="Quick filter by action, actor, entity…"
              value={textFilter}
              onChange={(e) => setTextFilter(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
            {filtered.map((log) => {
              const iconName = ACTION_ICON[log.action] || 'Circle'
              const Icon =
                (Icons as unknown as Record<string, Icons.LucideIcon>)[iconName] || Icons.Circle
              const meta = log.metadata
                ? (() => {
                    try {
                      return JSON.parse(log.metadata)
                    } catch {
                      return null
                    }
                  })()
                : null
              return (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{log.action}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {log.entityType}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {log.actor ? (
                        <>
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {initials(log.actor.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{log.actor.name}</span>
                        </>
                      ) : (
                        <span>System</span>
                      )}
                      <span>·</span>
                      <span>
                        {formatDate(log.createdAt, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {meta && (
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {Object.entries(meta)
                          .slice(0, 3)
                          .map(([k, v]) => (
                            <span key={k} className="mr-3">
                              <span className="opacity-60">{k}:</span>{' '}
                              <code className="rounded bg-muted px-1">{String(v)}</code>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
            {!loading && filtered.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No audit events{hasServerFilters ? ' match these filters' : ''}.
              </div>
            )}
            {loading && (
              <div className="py-12 text-center text-sm text-muted-foreground">Loading events…</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
