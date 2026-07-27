'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

interface Cycle {
  id: string
  name: string
  description?: string | null
  status: 'planned' | 'active' | 'completed'
  startDate?: string | null
  endDate?: string | null
  goal?: string | null
  projectId?: string | null
  project?: Project | null
  _count?: { tasks: number }
}

const STATUS_META: Record<
  Cycle['status'],
  { label: string; className: string }
> = {
  planned: {
    label: 'Planned',
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
  active: {
    label: 'Active',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  completed: {
    label: 'Completed',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  },
}

function toDateInputValue(iso?: string | null) {
  if (!iso) return ''\
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''\
  return d.toISOString().slice(0, 10)
}

function dateInputToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function CyclesView() {
  const { isModuleOn, setActiveView } = useAppStore()
  const [cycles, setCycles] = React.useState<Cycle[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [projectFilter, setProjectFilter] = React.useState<string>('all')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Cycle | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    name: '',
    description: '',
    goal: '',
    status: 'planned' as Cycle['status'],
    projectId: '' as string,
    startDate: '',
    endDate: '',
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (statusFilter !== 'all') qs.set('status', statusFilter)
      if (projectFilter !== 'all') qs.set('projectId', projectFilter)
      const q = qs.toString() ? `?${qs.toString()}` : ''\
      const [c, p] = await Promise.all([
        api<{ cycles: Cycle[] }>(`/api/cycles${q}`),
        api<{ projects: Project[] }>('/api/projects'),
      ])
      setCycles(c.cycles)
      setProjects(p.projects ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load cycles')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, projectFilter])

  React.useEffect(() => {
    if (isModuleOn('tasks')) load()
  }, [load, isModuleOn])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      description: '',
      goal: '',
      status: 'planned',
      projectId: '',
      startDate: '',
      endDate: '',
    })
    setDialogOpen(true)
  }

  const openEdit = (cycle: Cycle) => {
    setEditing(cycle)
    setForm({
      name: cycle.name,
      description: cycle.description ?? '',
      goal: cycle.goal ?? '',
      status: cycle.status,
      projectId: cycle.projectId ?? '',
      startDate: toDateInputValue(cycle.startDate),
      endDate: toDateInputValue(cycle.endDate),
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        goal: form.goal.trim() || null,
        status: form.status,
        projectId: form.projectId || null,
        startDate: dateInputToIso(form.startDate),
        endDate: dateInputToIso(form.endDate),
      }
      if (editing) {
        await api('/api/cycles', {
          method: 'PATCH',
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
        toast.success('Cycle updated')
      } else {
        await api('/api/cycles', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Cycle created')
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (cycle: Cycle) => {
    if (!confirm(`Delete cycle "${cycle.name}"? Tasks will be unlinked.`)) return
    try {
      await api(`/api/cycles?id=${encodeURIComponent(cycle.id)}`, { method: 'DELETE' })
      toast.success('Cycle deleted')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  if (!isModuleOn('tasks')) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icons.Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Tasks module is disabled</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Cycles live under the Tasks module. Enable it in the Marketplace.
          </p>
          <Button className="mt-4" onClick={() => setActiveView('settings')}>
            <Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace
          </Button>
        </CardContent>
      </Card>
    )
  }

  const counts = {
    planned: cycles.filter((c) => c.status === 'planned').length,
    active: cycles.filter((c) => c.status === 'active').length,
    completed: cycles.filter((c) => c.status === 'completed').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cycles / Sprints</h1>
          <p className="text-sm text-muted-foreground">
            {cycles.length} cycle{cycles.length === 1 ? '' : 's'} · {counts.active} active
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[180px] h-9">
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
          <Button size="sm" onClick={openCreate}>
            <Icons.Plus className="h-4 w-4" />
            <span className="ml-1.5">New cycle</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(['planned', 'active', 'completed'] as const).map((s) => (
          <Card key={s} className="border-dashed">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {STATUS_META[s].label}
                </div>
                <div className="text-2xl font-semibold">{counts[s]}</div>
              </div>
              <Badge className={cn('border-0', STATUS_META[s].className)}>{s}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground animate-pulse">
          Loading cycles…
        </div>
      ) : cycles.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Icons.Repeat className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No cycles yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a sprint or cycle to group tasks by timebox.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" /> Create first cycle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {cycles.map((cycle) => {
            const meta = STATUS_META[cycle.status]
            const taskCount = cycle._count?.tasks ?? 0
            return (
              <Card key={cycle.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{cycle.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {cycle.goal || cycle.description || 'No goal set'}
                      </CardDescription>
                    </div>
                    <Badge className={cn('shrink-0 border-0', meta.className)}>{meta.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {cycle.project && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cycle.project.color || '#64748b' }}
                        />
                        {cycle.project.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Icons.ListTodo className="h-3.5 w-3.5" />
                      {taskCount} task{taskCount === 1 ? '' : 's'}
                    </span>
                    {(cycle.startDate || cycle.endDate) && (
                      <span className="inline-flex items-center gap-1">
                        <Icons.Calendar className="h-3.5 w-3.5" />
                        {formatDate(cycle.startDate) || '—'} → {formatDate(cycle.endDate) || '—'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(cycle)}>
                      <Icons.Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(cycle)}
                    >
                      <Icons.Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setActiveView('tasks')}
                      title="Open tasks (filter by cycle via API)"
                    >
                      <Icons.ArrowRight className="h-3.5 w-3.5 mr-1" /> Tasks
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit cycle' : 'New cycle'}</DialogTitle>
            <DialogDescription>
              Timebox work into planned, active, or completed sprints.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="cycle-name">Name</Label>
              <Input
                id="cycle-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Sprint 12 · Q3 delivery"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cycle-goal">Goal</Label>
              <Input
                id="cycle-goal"
                value={form.goal}
                onChange={(e) => setForm((f) => ({ ...f, goal: e.target.value }))}
                placeholder="Ship billing v2"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cycle-desc">Description</Label>
              <Textarea
                id="cycle-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Optional notes"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as Cycle['status'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Project (optional)</Label>
                <Select
                  value={form.projectId || 'none'}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, projectId: v === 'none' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Org-wide" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Org-wide</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="cycle-start">Start</Label>
                <Input
                  id="cycle-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="cycle-end">End</Label>
                <Input
                  id="cycle-end"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create cycle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
