'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, initials, formatDate, daysUntil } from '@/lib/api'
import { cn } from '@/lib/utils'

interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}
interface Project {
  id: string
  name: string
  description?: string | null
  color: string
  status: string
  startDate?: string | null
  endDate?: string | null
  _count?: { tasks: number }
  createdBy?: { id: string; name: string }
}
interface Task {
  id: string
  title: string
  description?: string | null
  status: string
  priority: string
  type: string
  dueDate?: string | null
  estimateHours?: number | null
  spentHours?: number
  tags?: string | null
  position: number
  assignee?: User | null
  reporter?: User | null
  project?: Project | null
  projectId: string
}

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-sky-500' },
  { id: 'in_review', label: 'In Review', color: 'bg-amber-500' },
  { id: 'done', label: 'Done', color: 'bg-emerald-600' },
  { id: 'blocked', label: 'Blocked', color: 'bg-rose-500' },
]

const PRIORITY_RANK: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
const PRIORITY_BADGE: Record<string, string> = {
  urgent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  medium: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}
const TYPE_BADGE: Record<string, string> = {
  bug: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  feature: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  epic: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  task: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export function TasksView() {
  const { user, isModuleOn, setActiveView } = useAppStore()
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [team, setTeam] = React.useState<User[]>([])
  const [loading, setLoading] = React.useState(true)
  const [view, setView] = React.useState<'kanban' | 'list'>('kanban')
  const [filterProject, setFilterProject] = React.useState<string>('all')
  const [filterAssignee, setFilterAssignee] = React.useState<string>('all')
  const [filterPriority, setFilterPriority] = React.useState<string>('all')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterProject !== 'all') params.set('projectId', filterProject)
      if (filterAssignee !== 'all') params.set('assigneeId', filterAssignee)
      if (filterPriority !== 'all') params.set('status', filterPriority)
      const [t, p, team] = await Promise.all([
        api<{ tasks: Task[] }>(`/api/tasks?${params.toString()}`),
        api<{ projects: Project[] }>('/api/projects'),
        api<{ team: User[] }>('/api/team'),
      ])
      setTasks(t.tasks)
      setProjects(p.projects)
      setTeam(team.team)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [filterProject, filterAssignee, filterPriority])

  React.useEffect(() => {
    if (isModuleOn('tasks')) load()
  }, [load, isModuleOn])

  if (!isModuleOn('tasks')) {
    return <DisabledState moduleKey="tasks" />
  }

  const visibleTasks = filterPriority === 'all'
    ? tasks
    : tasks.filter((t) => t.priority === filterPriority)

  const onDragEnd = async (e: DragEndEvent) => {
    const taskId = String(e.active.id)
    const newStatus = String(e.over?.id)
    if (!newStatus) return
    const task = tasks.find((t) => t.id === taskId)
    if (!task || task.status === newStatus) return
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )
    try {
      await api('/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify({ id: taskId, status: newStatus }),
      })
      toast.success(`Moved to ${COLUMNS.find((c) => c.id === newStatus)?.label}`)
    } catch (err) {
      toast.error('Failed to update task')
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: task.status } : t))
      )
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks &amp; Projects</h1>
          <p className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length === 1 ? '' : 's'} across {projects.length} project{projects.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              <SelectItem value={user?.id ?? ''}>Assigned to me</SelectItem>
              {team.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setView(view === 'kanban' ? 'list' : 'kanban')}>
            {view === 'kanban' ? <Icons.List className="h-4 w-4" /> : <Icons.Columns3 className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">{view === 'kanban' ? 'List' : 'Kanban'}</span>
          </Button>
          <CreateTaskDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            projects={projects}
            team={team}
            defaultProject={filterProject !== 'all' ? filterProject : projects[0]?.id}
            onCreated={() => load()}
          />
        </div>
      </div>

      {/* Kanban */}
      {view === 'kanban' && (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {COLUMNS.map((col) => {
              const colTasks = visibleTasks
                .filter((t) => t.status === col.id)
                .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99) || a.position - b.position)
              return (
                <KanbanColumn key={col.id} col={col} tasks={colTasks} onTaskClick={setSelectedTask} />
              )
            })}
          </div>
        </DndContext>
      )}

      {/* List */}
      {view === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {visibleTasks
                .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99))
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40 transition-colors"
                  >
                    <span
                      className={cn('h-2 w-2 shrink-0 rounded-full')}
                      style={{ backgroundColor: COLUMNS.find((c) => c.id === t.status)?.color.replace('bg-', '') === 'slate-400' ? '#94a3b8' : t.status === 'in_progress' ? '#0ea5e9' : t.status === 'in_review' ? '#f59e0b' : t.status === 'done' ? '#10b981' : '#ef4444' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{t.title}</span>
                        <Badge variant="outline" className={cn('text-[10px]', TYPE_BADGE[t.type])}>
                          {t.type}
                        </Badge>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: t.project?.color }}
                        >
                          <Icons.Circle className="h-2 w-2" />
                          {t.project?.name}
                        </span>
                        {t.dueDate && (
                          <span className={cn(daysUntil(t.dueDate) !== null && daysUntil(t.dueDate)! < 0 && t.status !== 'done' && 'text-rose-600')}>
                            <Icons.Calendar className="mr-0.5 inline h-3 w-3" />
                            {formatDate(t.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={cn('text-[10px]', PRIORITY_BADGE[t.priority])}>{t.priority}</Badge>
                    {t.assignee && (
                      <Avatar className="h-6 w-6 ring-1 ring-border">
                        <AvatarFallback className="text-[9px]">{initials(t.assignee.name)}</AvatarFallback>
                      </Avatar>
                    )}
                  </button>
                ))}
              {visibleTasks.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">No tasks match these filters.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task detail drawer */}
      <TaskDetailDialog
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        projects={projects}
        team={team}
        onUpdated={() => load()}
      />
    </div>
  )
}

function KanbanColumn({
  col,
  tasks,
  onTaskClick,
}: {
  col: { id: string; label: string; color: string }
  tasks: Task[]
  onTaskClick: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id })
  return (
    <div className="flex flex-col rounded-lg bg-muted/40 min-h-[200px]">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 rounded-full', col.color)} />
          <span className="text-xs font-semibold uppercase tracking-wide">{col.label}</span>
        </div>
        <Badge variant="secondary" className="text-[10px]">{tasks.length}</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 space-y-2 p-2 overflow-y-auto scrollbar-thin max-h-[calc(100vh-260px)]',
          isOver && 'bg-emerald-100/40 dark:bg-emerald-950/20'
        )}
      >
        {tasks.map((t) => (
          <DraggableTask key={t.id} task={t} onClick={() => onTaskClick(t)} />
        ))}
        {tasks.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableTask({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  })
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 }
    : undefined
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group rounded-md border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md cursor-pointer',
        isDragging && 'opacity-50'
      )}
      onClick={(e) => {
        if (isDragging) return
        e.stopPropagation()
        onClick()
      }}
    >
      <div className="flex items-start gap-2">
        <Badge className={cn('text-[9px] capitalize', PRIORITY_BADGE[task.priority])}>
          {task.priority}
        </Badge>
        {task.type !== 'task' && (
          <Badge variant="outline" className={cn('text-[9px] capitalize', TYPE_BADGE[task.type])}>
            {task.type}
          </Badge>
        )}
      </div>
      <div className="mt-1.5 text-sm font-medium leading-snug">{task.title}</div>
      {task.project && (
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Icons.Circle className="h-2 w-2" style={{ color: task.project.color }} />
          <span className="truncate">{task.project.name}</span>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        {task.dueDate ? (
          <span className="text-[10px] text-muted-foreground">
            <Icons.Calendar className="mr-0.5 inline h-3 w-3" />
            {formatDate(task.dueDate, { day: '2-digit', month: 'short' })}
          </span>
        ) : (
          <span />
        )}
        {task.assignee && (
          <Avatar className="h-5 w-5 ring-1 ring-background">
            <AvatarFallback className="text-[9px]">{initials(task.assignee.name)}</AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  )
}

function CreateTaskDialog({
  open,
  onOpenChange,
  projects,
  team,
  defaultProject,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projects: Project[]
  team: User[]
  defaultProject?: string
  onCreated: () => void
}) {
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [projectId, setProjectId] = React.useState(defaultProject || '')
  const [assigneeId, setAssigneeId] = React.useState('')
  const [priority, setPriority] = React.useState('medium')
  const [type, setType] = React.useState('task')
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined)
  const [estimateHours, setEstimateHours] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open && defaultProject) setProjectId(defaultProject)
  }, [open, defaultProject])

  const submit = async () => {
    if (!title.trim() || !projectId) {
      toast.error('Title and project are required')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          projectId,
          assigneeId: assigneeId || null,
          priority,
          type,
          dueDate: dueDate ? dueDate.toISOString() : null,
          estimateHours: estimateHours ? Number(estimateHours) : null,
        }),
      })
      toast.success('Task created')
      setTitle('')
      setDescription('')
      setAssigneeId('')
      setPriority('medium')
      setType('task')
      setDueDate(undefined)
      setEstimateHours('')
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Icons.Plus className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">New task</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>Add a new task to a project. You can edit details later.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="task-title">Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement login screen"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="task-desc">Description</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Add context, acceptance criteria, or links…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Project *</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger><SelectValue placeholder="Pick project" /></SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {team.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="feature">Feature</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                  <SelectItem value="epic">Epic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Icons.Calendar className="mr-2 h-4 w-4" />
                    {dueDate ? formatDate(dueDate) : 'Pick date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label htmlFor="est">Estimate (hrs)</Label>
              <Input
                id="est"
                type="number"
                min="0"
                step="0.5"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TaskDetailDialog({
  task,
  onClose,
  projects,
  team,
  onUpdated,
}: {
  task: Task | null
  onClose: () => void
  projects: Project[]
  team: User[]
  onUpdated: () => void
}) {
  const [edit, setEdit] = React.useState<Task | null>(task)
  React.useEffect(() => setEdit(task), [task])

  if (!task || !edit) return null

  const save = async (patch: Partial<Task>) => {
    setEdit({ ...edit, ...patch })
    try {
      await api('/api/tasks', {
        method: 'PATCH',
        body: JSON.stringify({ id: task.id, ...patch }),
      })
      onUpdated()
    } catch {
      toast.error('Failed to update')
    }
  }

  const remove = async () => {
    try {
      await api(`/api/tasks?id=${task.id}`, { method: 'DELETE' })
      toast.success('Task deleted')
      onClose()
      onUpdated()
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <Dialog open={!!task} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn('text-[10px] capitalize', TYPE_BADGE[edit.type])}>
              {edit.type}
            </Badge>
            <Badge className={cn('text-[10px] capitalize', PRIORITY_BADGE[edit.priority])}>
              {edit.priority}
            </Badge>
            {edit.project && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Icons.Circle className="h-2 w-2" style={{ color: edit.project.color }} />
                {edit.project.name}
              </span>
            )}
          </div>
          <DialogTitle className="text-lg">{edit.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Description</Label>
            <Textarea
              value={edit.description || ''}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              onBlur={() => save({ description: edit.description })}
              rows={3}
              placeholder="No description"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Status</Label>
              <Select value={edit.status} onValueChange={(v) => save({ status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLUMNS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Priority</Label>
              <Select value={edit.priority} onValueChange={(v) => save({ priority: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Assignee</Label>
              <Select
                value={edit.assignee?.id || ''}
                onValueChange={(v) => save({ assigneeId: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {team.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Due date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-1 w-full justify-start font-normal">
                    <Icons.Calendar className="mr-2 h-4 w-4" />
                    {edit.dueDate ? formatDate(edit.dueDate) : 'None'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={edit.dueDate ? new Date(edit.dueDate) : undefined}
                    onSelect={(d) => save({ dueDate: d ? d.toISOString() : null })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Estimate (hrs)</Label>
              <Input
                type="number"
                value={edit.estimateHours ?? ''}
                onChange={(e) => setEdit({ ...edit, estimateHours: e.target.value ? Number(e.target.value) : null })}
                onBlur={() => save({ estimateHours: edit.estimateHours })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Spent (hrs)</Label>
              <Input
                type="number"
                value={edit.spentHours ?? 0}
                onChange={(e) => setEdit({ ...edit, spentHours: e.target.value ? Number(e.target.value) : 0 })}
                onBlur={() => save({ spentHours: edit.spentHours })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs uppercase text-muted-foreground">Tags</Label>
            <Input
              value={edit.tags || ''}
              onChange={(e) => setEdit({ ...edit, tags: e.target.value })}
              onBlur={() => save({ tags: edit.tags })}
              placeholder="comma, separated, tags"
              className="mt-1"
            />
          </div>

          {edit.assignee && (
            <div className="rounded-md bg-muted/40 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[10px]">{initials(edit.assignee.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{edit.assignee.name}</div>
                  <div className="text-muted-foreground">{edit.assignee.email}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="destructive" size="sm" onClick={remove} className="mr-auto">
            <Icons.Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
          </Button>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DisabledState({ moduleKey }: { moduleKey: 'tasks' | 'rooms' | 'reporting' }) {
  const { setActiveView } = useAppStore()
  const labels = {
    tasks: ['Task Management', 'Organize projects, tasks, and subtasks with Kanban, list, and calendar views.'],
    rooms: ['Room Booking', 'Book meeting rooms with conflict prevention and recurring support.'],
    reporting: ['Reporting', 'Cross-module dashboards with charts and exports.'],
  } as const
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Icons.Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">{labels[moduleKey][0]} is disabled</h3>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">{labels[moduleKey][1]}</p>
        <Button className="mt-4" onClick={() => setActiveView('settings')}>
          <Icons.Store className="mr-2 h-4 w-4" /> Enable in Marketplace
        </Button>
      </CardContent>
    </Card>
  )
}
