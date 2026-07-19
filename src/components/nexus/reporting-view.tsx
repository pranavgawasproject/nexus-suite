'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { useAppStore } from '@/lib/store'
import { api } from '@/lib/api'

interface ReportData {
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

export function ReportingView() {
  const { isModuleOn, setActiveView } = useAppStore()
  const [data, setData] = React.useState<ReportData | null>(null)

  React.useEffect(() => {
    if (isModuleOn('reporting')) {
      api<ReportData>('/api/dashboard').then(setData).catch(() => {})
    }
  }, [isModuleOn])

  if (!isModuleOn('reporting')) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icons.Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Reporting is disabled</h3>
          <p className="mt-1 text-sm text-muted-foreground">Enable this module in the Marketplace.</p>
          <Button className="mt-4" onClick={() => setActiveView('settings')}>
            <Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-3 h-48 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const statusData = Object.entries(data.statusCounts).map(([k, v]) => ({
    name: STATUS_LABEL[k] || k,
    value: v,
    color: STATUS_COLORS[k] || '#94a3b8',
  }))
  const priorityData = Object.entries(data.priorityCounts).map(([k, v]) => ({
    name: k.charAt(0).toUpperCase() + k.slice(1),
    value: v,
  }))
  const workloadData = data.workload.map((w) => ({
    name: w.name.split(' ')[0],
    open: w.open,
    done: w.done,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reporting &amp; Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Cross-module dashboards — widgets gracefully hide for disabled modules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open('/api/export?module=all&format=json', '_blank')}>
            <Icons.Download className="mr-2 h-4 w-4" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open('/api/export?module=tasks&format=csv', '_blank')}>
            <Icons.FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatTile label="Completion rate" value={`${data.kpis.completionRate}%`} icon="CheckCircle2" accent="text-emerald-600" />
        <StatTile label="Open tasks" value={String(data.kpis.openTasks)} icon="ListChecks" accent="text-sky-600" />
        <StatTile label="Active projects" value={String(data.kpis.activeProjects)} icon="FolderKanban" accent="text-amber-600" />
        <StatTile label="Team size" value={String(data.kpis.teamSize)} icon="Users" accent="text-violet-600" />
      </div>

      {/* Charts grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Task status area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task status breakdown</CardTitle>
            <CardDescription>Across all active projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statusData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <defs>
                    {statusData.map((s, i) => (
                      <linearGradient key={i} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color} stopOpacity={0.6} />
                        <stop offset="95%" stopColor={s.color} stopOpacity={0.05} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#grad-0)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Priority pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Priority distribution</CardTitle>
            <CardDescription>Where attention is concentrated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {priorityData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={['#ef4444', '#f59e0b', '#10b981', '#94a3b8'][i % 4]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Workload bar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Team workload</CardTitle>
            <CardDescription>Open vs completed tasks per person</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workloadData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="open" name="Open" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="done" name="Done" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Room utilisation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Room utilisation</CardTitle>
            <CardDescription>Bookings in next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.bookingsPerRoom} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={70} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }} />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project progress table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project completion</CardTitle>
          <CardDescription>Tasks done vs total per project</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {data.tasksPerProject.map((p) => {
              const pct = p.count ? Math.round((p.done / p.count) * 100) : 0
              return (
                <div key={p.name} className="flex items-center gap-4 px-4 py-3">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.done}/{p.count}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <Badge variant="outline" className="tabular-nums">{pct}%</Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Module adoption */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module adoption</CardTitle>
          <CardDescription>
            {data.kpis.activeModules} of {data.kpis.totalModules} modules active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {data.modules.map((m) => (
              <Badge
                key={m.moduleKey}
                variant={m.state === 'active' || m.state === 'trial' ? 'default' : 'outline'}
                className="capitalize"
              >
                {m.moduleKey} · {m.state}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatTile({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string
  icon: keyof typeof Icons
  accent: string
}) {
  const Icon = Icons[icon] as Icons.LucideIcon
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg bg-muted ${accent}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  )
}
