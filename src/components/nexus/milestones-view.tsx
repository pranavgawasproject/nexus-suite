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

interface Milestone {
  id: string
  name: string
  description?: string | null
  status: 'planned' | 'active' | 'completed'
  dueDate?: string | null
  projectId: string
  project?: Project | null
  _count?: { tasks: number }
  createdAt?: string
}

const STATUS_META: Record<
  Milestone['status'],
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
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

function dateInputToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function MilestonesView() {
  const { isModuleOn, setActiveView } = useAppStore()
  const [milestones, setMilestones] = React.useState<Milestone[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [loading, setLoading] = React.useState(true)
  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [projectFilter, setProjectFilter] = React.useState<string>('all')
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Milestone | null>(null)
  const [saving, setSaving] = React.useState(false)

  const [form, setForm] = React.useState({
    name: '',
    description: '',
    status: 'planned' as Milestone['status'],
    projectId: '' as string,
    dueDate: '',
  })

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (statusFilter !== 'all') qs.set('status', statusFilter)
      if (projectFilter !== 'all') qs.set('projectId', projectFilter)
      const q = qs.toString() ? `?${qs.toString()}` : ''
      const [m, p] = await Promise.all([
        api<{ milestones: Milestone[] }>(`/api/milestones${q}`),
        api<{ projects: Project[] }>('/api/projects'),
      ])
      setMilestones(m.milestones ?? [])
      setProjects(p.projects ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load milestones')
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
      status: 'planned',
      projectId: projects[0]?.id ?? '',
      dueDate: '',
    })
    setDialogOpen(true)
  }

  const openEdit = (ms: Milestone) => {
    setEditing(ms)
    setForm({
      name: ms.name,
      description: ms.description ?? '',
      status: ms.status,
      projectId: ms.projectId,
      dueDate: toDateInputValue(ms.dueDate),
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!form.projectId) {
      toast.error('Project is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        projectId: form.projectId,
        dueDate: dateInputToIso(form.dueDate),
      }
      if (editing) {
        await api('/api/milestones', {
          method: 'PATCH',
          body: JSON.stringify({ id: editing.id, ...payload }),
        })
        toast.success('Milestone updated')
      } else {
        await api('/api/milestones', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        toast.success('Milestone created')
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (ms: Milestone) => {
    if (!confirm(`Delete milestone "${ms.name}"? Linked tasks will be unlinked.`)) return
    try {
      await api(`/api/milestones?id=${encodeURIComponent(ms.id)}`, { method: 'DELETE' })
      toast.success('Milestone deleted')
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
            Milestones live under the Tasks module. Enable it in the Marketplace.
          </p>
          <Button className="mt-4" onClick={() => setActiveView('settings')}>
            <Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace
          </Button>
        </CardContent>
      </Card>
    )
  }

  const counts = {
    planned: milestones.filter((m) => m.status === 'planned').length,
    active: milestones.filter((m) => m.status === 'active').length,
    completed: milestones.filter((m) => m.status === 'completed').length,
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Project Milestones</h1>
          <p className="text-sm text-muted-foreground">
            {milestones.length} milestone{milestones.length === 1 ? '' : 's'} · {counts.active} active
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
          <Button size="sm" onClick={openCreate} disabled={projects.length === 0}>
            <Icons.Plus className="h-4 w-4" />
            <span className="ml-1.5">New milestone</span>
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
          Loading milestones…
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Icons.FolderOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create a project first, then add milestones to track delivery targets.
            </p>
            <Button className="mt-4" onClick={() => setActiveView('tasks')}>
              <Icons.ArrowRight className="mr-2 h-4 w-4" /> Open Tasks
            </Button>
          </CardContent>
        </Card>
      ) : milestones.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Icons.Flag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No milestones yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Define project milestones to mark key delivery dates and group related tasks.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              <Icons.Plus className="mr-2 h-4 w-4" /> Create first milestone
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {milestones.map((ms) => {
            const meta = STATUS_META[ms.status]
            const taskCount = ms._count?.tasks ?? 0
            return (
              <Card key={ms.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{ms.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {ms.description || 'No description'}
                      </CardDescription>
                    </div>
                    <Badge className={cn('shrink-0 border-0', meta.className)}>{meta.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {ms.project && (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: ms.project.color || '#64748b' }}
                        />
                        {ms.project.name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Icons.ListTodo className="h-3.5 w-3.5" />
                      {taskCount} task{taskCount === 1 ? '' : 's'}
                    </span>
                    {ms.dueDate && (
                      <span className="inline-flex items-center gap-1">
                        <Icons.Calendar className="h-3.5 w-3.5" />
                        Due {formatDate(ms.dueDate)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(ms)}>
                      <Icons.Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(ms)}
                    >
                      <Icons.Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setActiveView('tasks')}
                      title="Open tasks"
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
            <DialogTitle>{editing ? 'Edit milestone' : 'New milestone'}</DialogTitle>
            <DialogDescription>
              Mark a key delivery target for a project. Tasks can be linked via milestoneId.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="ms-name">Name</Label>
              <Input
                id="ms-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Beta launch · Client sign-off"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ms-desc">Description</Label>
              <Textarea
                id="ms-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional details"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as Milestone['status'] }))
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
                <Label htmlFor="ms-due">Due date</Label>
                <Input
                  id="ms-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Project</Label>
              <Select
                value={form.projectId || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, projectId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Create milestone'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
