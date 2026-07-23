'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import { api, formatDate, daysUntil } from '@/lib/api'

interface DashboardData {
  kpis: {
    totalTasks: number
    openTasks: number
    blockedTasks: number
    completionRate: number
    activeProjects: number
    totalRooms: number
    upcomingBookings: number
    teamSize: number
    activeModules: number
    totalModules: number
    pendingLeaves?: number
    onLeaveToday?: number
    checkedInToday?: number
    overAllocated?: number
    krasTotal?: number
    krasPendingReview?: number
    totalBudget?: number
    totalSpent?: number
  }
  statusCounts: Record<string, number>
  priorityCounts: Record<string, number>
  tasksPerProject: { name: string; color: string; count: number; done: number }[]
  workload: { name: string; open: number; done: number }[]
  bookingsPerRoom: { name: string; count: number }[]
  modules: { moduleKey: string; state: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  todo: '#94a3b8',
  in_progress: '#0ea5e9',
  in_review: '#f59e0b',
  done: '#10b981',
  blocked: '#ef4444',
}
const STATUS_LABEL: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  done: 'Done',
  blocked: 'Blocked',
}
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ef4444',
  high: '#f59e0b',
  medium: '#10b981',
  low: '#94a3b8',
}

export function DashboardView() {
  const { user, org, setActiveView, isModuleOn } = useAppStore()
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const d = await api<DashboardData>('/api/dashboard')
        if (mounted) setData(d)
      } catch {
        // ignore
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-muted-foreground">Failed to load dashboard.</div>
  }

  const kpis = data.kpis
  const statusData = Object.entries(data.statusCounts).map(([k, v]) => ({
    name: STATUS_LABEL[k] || k,
    value: v,
    color: STATUS_COLORS[k] || '#94a3b8',
  }))
  const priorityData = Object.entries(data.priorityCounts).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
    color: PRIORITY_COLORS[k] || '#94a3b8',
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across {org?.name} today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">{org?.plan} plan</Badge>
          <Badge variant="secondary">
            {kpis.activeModules}/{kpis.totalModules} modules active
          </Badge>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Open tasks"
          value={kpis.openTasks}
          sublabel={`${kpis.totalTasks} total`}
          icon="ListChecks"
          accent="emerald"
          onClick={() => setActiveView('tasks')}
        />
        <KpiCard
          label="Active projects"
          value={kpis.activeProjects}
          sublabel={`${kpis.completionRate}% complete`}
          icon="FolderKanban"
          accent="sky"
        />
        <KpiCard
          label="Upcoming bookings"
          value={kpis.upcomingBookings}
          sublabel={`${kpis.totalRooms} rooms`}
          icon="CalendarClock"
          accent="amber"
          onClick={() => setActiveView('rooms')}
        />
        <KpiCard
          label="Blocked tasks"
          value={kpis.blockedTasks}
          sublabel={kpis.blockedTasks > 0 ? 'Needs attention' : 'All clear'}
          icon="AlertCircle"
          accent="rose"
          onClick={() => setActiveView('tasks')}
        />
      </div>

      {/* Phase 2 module KPI cards — only render when the relevant module is enabled */}
      {(isModuleOn('leave') || isModuleOn('resource') || isModuleOn('kra') || isModuleOn('budget')) && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {isModuleOn('leave') && (
            <KpiCard
              label="Pending leaves"
              value={kpis.pendingLeaves ?? 0}
              sublabel={`${kpis.onLeaveToday ?? 0} on leave today · ${kpis.checkedInToday ?? 0} checked in`}
              icon="CalendarOff"
              accent="amber"
              onClick={() => setActiveView('leave')}
            />
          )}
          {isModuleOn('resource') && (
            <KpiCard
              label="Over-allocated"
              value={kpis.overAllocated ?? 0}
              sublabel={kpis.overAllocated ? 'Needs rebalancing' : 'Capacity balanced'}
              icon="Users"
              accent="violet"
              onClick={() => setActiveView('resource')}
            />
          )}
          {isModuleOn('kra') && (
            <KpiCard
              label="KRAs pending review"
              value={kpis.krasPendingReview ?? 0}
              sublabel={`${kpis.krasTotal ?? 0} total KRAs`}
              icon="Award"
              accent="rose"
              onClick={() => setActiveView('kra')}
            />
          )}
          {isModuleOn('budget') && (
            <KpiCard
              label="Budget used"
              value={`${kpis.totalBudget ? Math.round(((kpis.totalSpent ?? 0) / kpis.totalBudget) * 100) : 0}%`}
              sublabel={`₹${(kpis.totalSpent ?? 0).toLocaleString('en-IN')} of ₹${(kpis.totalBudget ?? 0).toLocaleString('en-IN')}`}
              icon="Wallet"
              accent="emerald"
              onClick={() => setActiveView('budget')}
            />
          )}
        </div>
      )}


      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Task status distribution */}
        {isModuleOn('tasks') && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Task status</CardTitle>
              <CardDescription>Distribution across all projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Priority pie */}
        {isModuleOn('tasks') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Priority mix</CardTitle>
              <CardDescription>Where focus is needed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={priorityData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Workload + per-project */}
      <div className="grid gap-4 lg:grid-cols-2">
        {isModuleOn('tasks') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workload by team member</CardTitle>
              <CardDescription>Open vs done tasks per assignee</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.workload
                  .filter((w) => w.open + w.done > 0)
                  .map((w) => {
                    const total = w.open + w.done
                    const openPct = total ? (w.open / total) * 100 : 0
                    return (
                      <div key={w.name}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium">{w.name}</span>
                          <span className="text-muted-foreground">
                            {w.open} open · {w.done} done
                          </span>
                        </div>
                        <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                          <div className="bg-amber-500" style={{ width: `${openPct}%` }} />
                          <div className="bg-emerald-500" style={{ width: `${100 - openPct}%` }} />
                        </div>
                      </div>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {isModuleOn('rooms') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Room utilisation</CardTitle>
              <CardDescription>Bookings in the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.bookingsPerRoom} layout="vertical" margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={70} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Project progress */}
      {isModuleOn('tasks') && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project progress</CardTitle>
            <CardDescription>Tasks completed per project</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.tasksPerProject.map((p) => {
                const pct = p.count ? Math.round((p.done / p.count) * 100) : 0
                return (
                  <button
                    key={p.name}
                    onClick={() => setActiveView('tasks')}
                    className="rounded-lg border p-4 text-left hover:bg-accent/40 transition-colors"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{p.done} of {p.count} done</span>
                      <span>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {!isModuleOn('tasks') && !isModuleOn('rooms') && (
        <Card>
          <CardContent className="p-8 text-center">
            <Icons.Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No modules enabled yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Head to the Module Marketplace to enable tasks, room booking, and reporting.
            </p>
            <Button className="mt-4" onClick={() => setActiveView('settings')}>
              <Icons.Store className="mr-2 h-4 w-4" /> Open Module Marketplace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sublabel,
  icon,
  accent,
  onClick,
}: {
  label: string
  value: number | string
  sublabel?: string
  icon: keyof typeof Icons
  accent: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet'
  onClick?: () => void
}) {
  const Icon = Icons[icon] as Icons.LucideIcon
  const accentClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  }[accent]

  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}>
      <CardContent className="p-5" onClick={onClick}>
        <div className="flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClasses}`}>
            <Icon className="h-5 w-5" />
          </div>
          {onClick && <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold tabular-nums">{value}</div>
          <div className="text-sm font-medium text-foreground">{label}</div>
          {sublabel && <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>}
        </div>
      </CardContent>
    </Card>
  )
}
