'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Project {
  id: string
  name: string
  color?: string | null
}

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string | null
  projectId: string
  project?: Project | null
  cycleId?: string | null
  milestoneId?: string | null
  estimateHours?: number | null
}

interface Dep {
  id: string
  type: 'blocks' | 'relates'
  fromTaskId: string
  toTaskId: string
  fromTask: { id: string; title: string; status: string }
  toTask: { id: string; title: string; status: string }
}

const STATUS_COLOR: Record<string, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-sky-500',
  in_review: 'bg-amber-500',
  done: 'bg-emerald-600',
  blocked: 'bg-rose-500',
}

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function daysBetween(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS)
}

function addDays(d: Date, n: number) {
  return new Date(d.getTime() + n * DAY_MS)
}

export function GanttView() {
  const { isModuleOn, setActiveView } = useAppStore()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [deps, setDeps] = React.useState<Dep[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [projectFilter, setProjectFilter] = React.useState<string>('all')
  const [statusFilter, setStatusFilter] = React.useState<string>('all')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, dRes, pRes] = await Promise.all([
        api<{ tasks: Task[] }>('/api/tasks'),
        api<{ dependencies: Dep[] }>('/api/dependencies'),
        api<{ projects: Project[] }>('/api/projects'),
      ])
      setTasks(tRes.tasks || [])
      setDeps(dRes.dependencies || [])
      setProjects(pRes.projects || [])
    } catch {
      toast.error('Failed to load Gantt data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  if (!isModuleOn('tasks')) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gantt timeline</CardTitle>
          <CardDescription>Enable the Tasks module to use the timeline view.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setActiveView('settings')}>Open Module Marketplace</Button>
        </CardContent>
      </Card>
    )
  }

  const filtered = tasks.filter((t) => {
    if (projectFilter !== 'all' && t.projectId !== projectFilter) return false
    if (statusFilter !== 'all' && t.status !== statusFilter) return false
    return true
  })

  const dated = filtered.filter((t) => t.dueDate && !Number.isNaN(new Date(t.dueDate).getTime()))
  const undated = filtered.filter((t) => !t.dueDate || Number.isNaN(new Date(t.dueDate!).getTime()))

  const today = startOfDay(new Date())
  let rangeStart = today
  let rangeEnd = addDays(today, 28)
  if (dated.length > 0) {
    const times = dated.map((t) => startOfDay(new Date(t.dueDate!)).getTime())
    const minT = Math.min(...times, today.getTime())
    const maxT = Math.max(...times, today.getTime())
    rangeStart = addDays(new Date(minT), -3)
    rangeEnd = addDays(new Date(maxT), 7)
  }
  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd))
  const dayTicks: Date[] = []
  for (let i = 0; i <= totalDays; i++) dayTicks.push(addDays(rangeStart, i))

  const blockedBy = React.useMemo(() => {
    const m = new Map<string, string[]>()
    for (const d of deps) {
      if (d.type !== 'blocks') continue
      const list = m.get(d.toTaskId) || []
      list.push(d.fromTask.title)
      m.set(d.toTaskId, list)
    }
    return m
  }, [deps])

  const blocks = React.useMemo(() => {
    const m = new Map<string, string[]>()
    for (const d of deps) {
      if (d.type !== 'blocks') continue
      const list = m.get(d.fromTaskId) || []
      list.push(d.toTask.title)
      m.set(d.fromTaskId, list)
    }
    return m
  }, [deps])

  const barStyle = (t: Task) => {
    if (!t.dueDate) return null
    const due = startOfDay(new Date(t.dueDate))
    const lenDays = Math.max(1, Math.min(14, t.estimateHours ? Math.ceil(t.estimateHours / 8) : 3))
    const barStart = addDays(due, -(lenDays - 1))
    const left = (daysBetween(rangeStart, barStart) / totalDays) * 100
    const width = (lenDays / totalDays) * 100
    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      width: `${Math.max(1.5, Math.min(100 - Math.max(0, left), width))}%`,
    }
  }

  const todayLeft = (daysBetween(rangeStart, today) / totalDays) * 100

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Icons.GanttChart className="h-5 w-5 text-emerald-600" />
            Gantt / Timeline
          </h1>
          <p className="text-sm text-muted-foreground">
            Project timeline with task bars and dependency hints (blocks / blocked by).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8" onClick={load}>
            <Icons.RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
          <Icons.Loader2 className="h-4 w-4 animate-spin" /> Loading timeline…
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No tasks match the current filters.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="flex border-b bg-muted/40 sticky top-0 z-10">
                  <div className="w-48 shrink-0 border-r px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
                    Task
                  </div>
                  <div className="relative flex-1 py-2">
                    <div className="relative h-6">
                      {dayTicks
                        .filter((_, i) => i % Math.ceil(totalDays / 10) === 0 || i === totalDays)
                        .map((d) => {
                          const left = (daysBetween(rangeStart, d) / totalDays) * 100
                          return (
                            <div
                              key={d.toISOString()}
                              className="absolute top-0 text-[10px] text-muted-foreground -translate-x-1/2"
                              style={{ left: `${left}%` }}
                            >
                              {d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>

                <ul>
                  {dated
                    .slice()
                    .sort(
                      (a, b) =>
                        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
                    )
                    .map((t) => {
                      const style = barStyle(t)!
                      const blockers = blockedBy.get(t.id) || []
                      const blocked = blocks.get(t.id) || []
                      return (
                        <li
                          key={t.id}
                          className="flex border-b last:border-b-0 hover:bg-muted/20"
                        >
                          <div className="w-48 shrink-0 border-r px-3 py-2.5">
                            <div className="text-sm font-medium truncate" title={t.title}>
                              {t.title}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className="text-[9px] capitalize h-4 px-1">
                                {t.status.replace(/_/g, ' ')}
                              </Badge>
                              {t.project && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                  {t.project.name}
                                </span>
                              )}
                            </div>
                            {(blockers.length > 0 || blocked.length > 0) && (
                              <div className="mt-1 space-y-0.5">
                                {blockers.length > 0 && (
                                  <div
                                    className="text-[10px] text-rose-600 dark:text-rose-400 truncate"
                                    title={blockers.join(', ')}
                                  >
                                    blocked by: {blockers.join(', ')}
                                  </div>
                                )}
                                {blocked.length > 0 && (
                                  <div
                                    className="text-[10px] text-amber-700 dark:text-amber-400 truncate"
                                    title={blocked.join(', ')}
                                  >
                                    blocks: {blocked.join(', ')}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="relative flex-1 py-2 px-1 min-h-[44px]">
                            {todayLeft >= 0 && todayLeft <= 100 && (
                              <div
                                className="absolute top-0 bottom-0 w-px bg-emerald-500/60 z-[1]"
                                style={{ left: `${todayLeft}%` }}
                              />
                            )}
                            <div
                              className={cn(
                                'absolute top-1/2 -translate-y-1/2 h-6 rounded-md shadow-sm text-[10px] text-white flex items-center px-1.5 truncate',
                                STATUS_COLOR[t.status] || 'bg-slate-500'
                              )}
                              style={style}
                              title={`${t.title} · due ${formatDate(t.dueDate!)}`}
                            >
                              <span className="truncate">{formatDate(t.dueDate!)}</span>
                            </div>
                          </div>
                        </li>
                      )
                    })}
                </ul>

                {undated.length > 0 && (
                  <div className="border-t bg-muted/20 px-3 py-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">
                      No due date ({undated.length})
                    </Label>
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {undated.map((t) => (
                        <li key={t.id}>
                          <Badge variant="secondary" className="text-xs font-normal">
                            {t.title}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Bar length uses estimate hours (8h ≈ 1 day) or 3 days by default, ending on the task due date.
        Dependency labels come from the Task Dependencies API.
      </p>
    </div>
  )
}
