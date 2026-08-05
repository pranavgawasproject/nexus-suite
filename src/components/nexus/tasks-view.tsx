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
import { api, initials, formatDate, daysUntil, relativeTime } from '@/lib/api'
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
interface Cycle {
  id: string
  name: string
  status: string
  projectId?: string | null
}

interface Milestone {
  id: string
  name: string
  status: string
  projectId: string
  dueDate?: string | null
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
  assigneeId?: string | null
  assignee?: User | null
  reporter?: User | null
  project?: Project | null
  projectId: string
  cycleId?: string | null
  cycle?: Cycle | null
  milestoneId?: string | null
  milestone?: Milestone | null
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
  const [filterCycle, setFilterCycle] = React.useState<string>('all')
  const [cycles, setCycles] = React.useState<Cycle[]>([])
  const [milestones, setMilestones] = React.useState<Milestone[]>([])
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
      if (filterCycle !== 'all') params.set('cycleId', filterCycle)
      const cycleParams = new URLSearchParams()
      if (filterProject !== 'all') cycleParams.set('projectId', filterProject)
      const [t, p, teamRes, c, m] = await Promise.all([
        api<{ tasks: Task[] }>(`/api/tasks?${params.toString()}`),
        api<{ projects: Project[] }>('/api/projects'),
        api<{ team: User[] }>('/api/team'),
        api<{ cycles: Cycle[] }>(`/api/cycles?${cycleParams.toString()}`),
        api<{ milestones: Milestone[] }>(`/api/milestones?${cycleParams.toString()}`),
      ])
      setTasks(t.tasks)
      setProjects(p.projects)
      setTeam(teamRes.team)
      setCycles(c.cycles)
      setMilestones(m.milestones)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [filterProject, filterAssignee, filterCycle])

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
          <Select value={filterCycle} onValueChange={setFilterCycle}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cycles</SelectItem>
              {cycles.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.status === 'active' ? ' Â· active' : c.status === 'completed' ? ' Â· done' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setView(view === 'kanban' ? 'list' : 'kanban')}>
            {view === 'kanban' ? <Icons.List className="h-4 w-4" /> : <Icons.Columns3 className="h-4 w-4" />}
            <span className="ml-1.5 hidden sm:inline">{view === 'kanban' ? 'List' : 'Kanban'}</span>
          </Button>
          <AiTaskButton projects={projects} team={team} onCreated={() => load()} />
          <CreateTaskDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            projects={projects}
            team={team}
            cycles={cycles}
            milestones={milestones}
            defaultProject={filterProject !== 'all' ? filterProject : projects[0]?.id}
            defaultCycle={filterCycle !== 'all' ? filterCycle : undefined}
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
                        {t.cycle && (
                          <span className="inline-flex items-center gap-1">
                            <Icons.RefreshCw className="h-3 w-3" />
                            {t.cycle.name}
                          </span>
                        )}
                        {t.milestone && (
                          <span className="inline-flex items-center gap-1">
                            <Icons.Flag className="h-3 w-3" />
                            {t.milestone.name}
                          </span>
                        )}
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
                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <Icons.ListTodo className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No tasks match these filters</p>
                  <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Create a task or clear filters to see work items for this project.
                  </p>
                </div>
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
        cycles={cycles}
        milestones={milestones}
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
      <div className="flex items-start gap-2 flex-wrap">
        <Badge className={cn('text-[9px] capitalize', PRIORITY_BADGE[task.priority])}>
          {task.priority}
        </Badge>
        {task.type !== 'task' && (
          <Badge variant="outline" className={cn('text-[9px] capitalize', TYPE_BADGE[task.type])}>
            {task.type}
          </Badge>
        )}
        {task.cycle && (
          <Badge variant="secondary" className="text-[9px]">
            <Icons.RefreshCw className="mr-0.5 inline h-2.5 w-2.5" />
            {task.cycle.name}
          </Badge>
        )}
        {task.milestone && (
          <Badge variant="outline" className="text-[9px]">
            <Icons.Flag className="mr-0.5 inline h-2.5 w-2.5" />
            {task.milestone.name}
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
  cycles,
  milestones,
  defaultProject,
  defaultCycle,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projects: Project[]
  team: User[]
  cycles: Cycle[]
  milestones: Milestone[]
  defaultProject?: string
  defaultCycle?: string
  onCreated: () => void
}) {
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [projectId, setProjectId] = React.useState(defaultProject || '')
  const [assigneeId, setAssigneeId] = React.useState('')
  const [priority, setPriority] = React.useState('medium')
  const [type, setType] = React.useState('task')
  const [cycleId, setCycleId] = React.useState(defaultCycle || '')
  const [milestoneId, setMilestoneId] = React.useState('')
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined)
  const [estimateHours, setEstimateHours] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (open && defaultProject) setProjectId(defaultProject)
    if (open && defaultCycle) setCycleId(defaultCycle)
  }, [open, defaultProject, defaultCycle])

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
          cycleId: cycleId || null,
          milestoneId: milestoneId || null,
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
      setCycleId('')
      setMilestoneId('')
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
              placeholder="Add context, acceptance criteria, or linksâ¦"
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
              <Label>Cycle / Sprint</Label>
              <Select value={cycleId || '__none__'} onValueChange={(v) => setCycleId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {cycles
                    .filter((c) => !c.projectId || c.projectId === projectId || !projectId)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.status === 'active' ? ' Â· active' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Milestone</Label>
              <Select value={milestoneId || '__none__'} onValueChange={(v) => setMilestoneId(v === '__none__' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {milestones
                    .filter((m) => m.projectId === projectId || !projectId)
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                        {m.status === 'completed' ? ' Â· done' : m.status === 'missed' ? ' Â· missed' : ''}
                      </SelectItem>
                    ))}
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

interface TaskComment {
  id: string
  body: string
  createdAt: string
  updatedAt?: string
  author: { id: string; name: string; email: string; avatarUrl?: string | null }
}

function TaskComments({ taskId }: { taskId: string }) {
  const currentUser = useAppStore((s) => s.user)
  const [comments, setComments] = React.useState<TaskComment[]>([])
  const [loading, setLoading] = React.useState(true)
  const [body, setBody] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editBody, setEditBody] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ comments: TaskComment[] }>(`/api/comments?taskId=${encodeURIComponent(taskId)}`)
      setComments(d.comments || [])
    } catch {
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  React.useEffect(() => {
    load()
  }, [load])

  const post = async () => {
    const trimmed = body.trim()
    if (!trimmed) return
    setSubmitting(true)
    try {
      const d = await api<{ comment: TaskComment }>('/api/comments', {
        method: 'POST',
        body: JSON.stringify({ taskId, body: trimmed }),
      })
      setComments((prev) => [...prev, d.comment])
      setBody('')
      toast.success('Comment added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const saveEdit = async (id: string) => {
    const trimmed = editBody.trim()
    if (!trimmed) return
    try {
      const d = await api<{ comment: TaskComment }>('/api/comments', {
        method: 'PATCH',
        body: JSON.stringify({ id, body: trimmed }),
      })
      setComments((prev) => prev.map((c) => (c.id === id ? d.comment : c)))
      setEditingId(null)
      setEditBody('')
      toast.success('Comment updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this comment?')) return
    try {
      await api(`/api/comments?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setComments((prev) => prev.filter((c) => c.id !== id))
      toast.success('Comment deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const canModify = (c: TaskComment) =>
    currentUser && (currentUser.id === c.author.id || currentUser.role === 'admin')

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
          <Icons.MessageSquare className="h-3.5 w-3.5" />
          Comments {comments.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{comments.length}</Badge>
          )}
        </Label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading commentsâ¦
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icons.MessageSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium">No comments yet</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Start the discussion on this task.</p>
        </div>
      ) : (
        <ul className="space-y-3 max-h-56 overflow-y-auto pr-1">
          {comments.map((c) => (
            <li key={c.id} className="rounded-md border bg-muted/20 p-2.5">
              <div className="flex items-start gap-2">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-[10px]">{initials(c.author.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium">{c.author.name}</span>
                    <span className="text-[10px] text-muted-foreground" title={formatDate(c.createdAt)}>
                      {relativeTime(c.createdAt)}
                    </span>
                  </div>
                  {editingId === c.id ? (
                    <div className="mt-1.5 space-y-1.5">
                      <Textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        rows={2}
                        className="text-sm"
                        autoFocus
                      />
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs" onClick={() => saveEdit(c.id)}>
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setEditingId(null)
                            setEditBody('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 text-sm whitespace-pre-wrap break-words">{c.body}</p>
                  )}
                </div>
                {canModify(c) && editingId !== c.id && (
                  <div className="flex shrink-0 gap-0.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Edit"
                      onClick={() => {
                        setEditingId(c.id)
                        setEditBody(c.body)
                      }}
                    >
                      <Icons.Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      title="Delete"
                      onClick={() => remove(c.id)}
                    >
                      <Icons.Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Write a commentâ¦"
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              post()
            }
          }}
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={post} disabled={submitting || !body.trim()}>
            {submitting ? (
              <>
                <Icons.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Postingâ¦
              </>
            ) : (
              <>
                <Icons.Send className="mr-1.5 h-3.5 w-3.5" /> Comment
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}


interface TaskDependencyRow {
  id: string
  type: 'blocks' | 'relates'
  fromTaskId: string
  toTaskId: string
  fromTask: { id: string; title: string; status: string }
  toTask: { id: string; title: string; status: string }
}

function TaskDependencies({ taskId }: { taskId: string }) {
  const [deps, setDeps] = React.useState<TaskDependencyRow[]>([])
  const [allTasks, setAllTasks] = React.useState<{ id: string; title: string; status: string }[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [otherTaskId, setOtherTaskId] = React.useState('')
  const [depType, setDepType] = React.useState<'blocks' | 'relates'>('blocks')
  const [direction, setDirection] = React.useState<'blocks' | 'blocked_by'>('blocks')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [d, t] = await Promise.all([
        api<{ dependencies: TaskDependencyRow[] }>(`/api/dependencies?taskId=${encodeURIComponent(taskId)}`),
        api<{ tasks: { id: string; title: string; status: string }[] }>('/api/tasks'),
      ])
      setDeps(d.dependencies || [])
      setAllTasks((t.tasks || []).filter((x) => x.id !== taskId))
    } catch {
      toast.error('Failed to load dependencies')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  React.useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    if (!otherTaskId) return
    setSubmitting(true)
    try {
      const fromTaskId = direction === 'blocks' ? taskId : otherTaskId
      const toTaskId = direction === 'blocks' ? otherTaskId : taskId
      const type = depType
      const d = await api<{ dependency: TaskDependencyRow }>('/api/dependencies', {
        method: 'POST',
        body: JSON.stringify({ fromTaskId, toTaskId, type }),
      })
      setDeps((prev) => [...prev, d.dependency])
      setOtherTaskId('')
      toast.success('Dependency added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add dependency')
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this dependency?')) return
    try {
      await api(`/api/dependencies?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setDeps((prev) => prev.filter((x) => x.id !== id))
      toast.success('Dependency removed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  const labelFor = (dep: TaskDependencyRow) => {
    if (dep.type === 'relates') {
      const other = dep.fromTaskId === taskId ? dep.toTask : dep.fromTask
      return { verb: 'relates to', other }
    }
    if (dep.fromTaskId === taskId) {
      return { verb: 'blocks', other: dep.toTask }
    }
    return { verb: 'blocked by', other: dep.fromTask }
  }

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
          <Icons.GitBranch className="h-3.5 w-3.5" />
          Dependencies {deps.length > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{deps.length}</Badge>
          )}
        </Label>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading dependencies…
        </div>
      ) : deps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icons.GitBranch className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium">No dependencies yet</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Link related or blocking tasks.</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {deps.map((dep) => {
            const { verb, other } = labelFor(dep)
            return (
              <li key={dep.id} className="rounded-md border bg-muted/20 p-2 flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-[10px] shrink-0 capitalize',
                    dep.type === 'blocks' ? 'border-rose-300 text-rose-700 dark:text-rose-300' : 'border-slate-300'
                  )}
                >
                  {verb}
                </Badge>
                <span className="text-sm truncate flex-1" title={other.title}>
                  {other.title}
                </span>
                <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                  {other.status.replace('_', ' ')}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-destructive shrink-0"
                  title="Remove"
                  onClick={() => remove(dep.id)}
                >
                  <Icons.Trash2 className="h-3 w-3" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Select value={direction} onValueChange={(v) => setDirection(v as 'blocks' | 'blocked_by')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blocks">This blocks</SelectItem>
              <SelectItem value="blocked_by">Blocked by</SelectItem>
            </SelectContent>
          </Select>
          <Select value={depType} onValueChange={(v) => setDepType(v as 'blocks' | 'relates')}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="blocks">Blocks</SelectItem>
              <SelectItem value="relates">Relates</SelectItem>
            </SelectContent>
          </Select>
          <Select value={otherTaskId || '__none__'} onValueChange={(v) => setOtherTaskId(v === '__none__' ? '' : v)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select task" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Select task…</SelectItem>
              {allTasks.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={add} disabled={submitting || !otherTaskId}>
            {submitting ? (
              <>
                <Icons.Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Adding…
              </>
            ) : (
              <>
                <Icons.Link className="mr-1.5 h-3.5 w-3.5" /> Add dependency
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}




interface WorklogItem {
  id: string
  hours: number
  note?: string | null
  loggedAt: string
  author?: { id: string; name: string; email: string } | null
}

function TaskWorklogs({ taskId }: { taskId: string }) {
  const [items, setItems] = React.useState<WorklogItem[]>([])
  const [spentHours, setSpentHours] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [hours, setHours] = React.useState('')
  const [note, setNote] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ worklogs: WorklogItem[]; spentHours: number }>(
        `/api/worklogs?taskId=${encodeURIComponent(taskId)}`
      )
      setItems(d.worklogs || [])
      setSpentHours(d.spentHours ?? 0)
    } catch {
      toast.error('Failed to load worklogs')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  React.useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    const h = parseFloat(hours)
    if (!h || h <= 0) return
    setSaving(true)
    try {
      const d = await api<{ worklog: WorklogItem; spentHours: number }>('/api/worklogs', {
        method: 'POST',
        body: JSON.stringify({ taskId, hours: h, note: note.trim() || undefined }),
      })
      setItems((prev) => [d.worklog, ...prev])
      setSpentHours(d.spentHours)
      setHours('')
      setNote('')
      toast.success('Time logged')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to log time')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this time entry?')) return
    try {
      const d = await api<{ spentHours: number }>(`/api/worklogs?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      setItems((prev) => prev.filter((i) => i.id !== id))
      setSpentHours(d.spentHours ?? 0)
      toast.success('Entry removed')
    } catch {
      toast.error('Failed to remove entry')
    }
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Icons.Clock className="h-4 w-4" />
          Time logged{' '}
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {spentHours.toFixed(2)}h
          </Badge>
        </h4>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
          <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading worklogs…
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icons.Timer className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium">No time entries yet</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Log hours spent on this task.</p>
        </div>
      ) : (
        <ul className="space-y-1.5 max-h-40 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 group text-sm">
              <span className="font-medium tabular-nums w-12 shrink-0">{item.hours}h</span>
              <div className="flex-1 min-w-0">
                <span className="text-muted-foreground text-xs">
                  {item.author?.name || 'Someone'} · {new Date(item.loggedAt).toLocaleDateString()}
                </span>
                {item.note && <p className="text-xs truncate">{item.note}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
                onClick={() => remove(item.id)}
              >
                <Icons.Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 pt-1 items-center">
        <Input
          type="number"
          min={0.25}
          step={0.25}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="Hours"
          className="h-8 text-sm w-20"
        />
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Note (optional)…"
          className="h-8 text-sm flex-1"
        />
        <Button size="sm" className="h-8" onClick={add} disabled={saving || !hours || parseFloat(hours) <= 0}>
          {saving ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Log'}
        </Button>
      </div>
    </div>
  )
}

interface ChecklistItem {
  id: string
  title: string
  completed: boolean
  position: number
}

function TaskChecklist({ taskId }: { taskId: string }) {
  const [items, setItems] = React.useState<ChecklistItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [newTitle, setNewTitle] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const d = await api<{ items: ChecklistItem[] }>(`/api/checklists?taskId=${encodeURIComponent(taskId)}`)
      setItems(d.items || [])
    } catch {
      toast.error('Failed to load checklist')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  React.useEffect(() => {
    load()
  }, [load])

  const add = async () => {
    const title = newTitle.trim()
    if (!title) return
    setSaving(true)
    try {
      const d = await api<{ item: ChecklistItem }>('/api/checklists', {
        method: 'POST',
        body: JSON.stringify({ taskId, title }),
      })
      setItems((prev) => [...prev, d.item])
      setNewTitle('')
      toast.success('Checklist item added')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (id: string, completed: boolean) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, completed } : i)))
    try {
      await api('/api/checklists', {
        method: 'PATCH',
        body: JSON.stringify({ id, completed }),
      })
    } catch {
      toast.error('Failed to update item')
      load()
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this checklist item?')) return
    try {
      await api(`/api/checklists?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Item removed')
    } catch {
      toast.error('Failed to remove item')
    }
  }

  const done = items.filter((i) => i.completed).length
  const total = items.length

  return (
    <div className="space-y-2 border-t pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <Icons.CheckSquare className="h-4 w-4" />
          Checklist{' '}
          {total > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
              {done}/{total}
            </Badge>
          )}
        </h4>
      </div>
      {loading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-2">
          <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading checklist…
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 px-2 text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Icons.CheckSquare className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium">No checklist items yet</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Break the task into steps.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 group">
              <input
                type="checkbox"
                checked={item.completed}
                onChange={(e) => toggle(item.id, e.target.checked)}
                className="h-3.5 w-3.5 rounded border-input"
              />
              <span
                className={
                  'flex-1 text-sm ' +
                  (item.completed ? 'line-through text-muted-foreground' : '')
                }
              >
                {item.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                onClick={() => remove(item.id)}
              >
                <Icons.Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2 pt-1">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Add a checklist item…"
          className="h-8 text-sm"
        />
        <Button size="sm" className="h-8" onClick={add} disabled={saving || !newTitle.trim()}>
          {saving ? <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icons.Plus className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  )
}

function TaskDetailDialog({
  task,
  onClose,
  projects,
  team,
  cycles,
  milestones,
  onUpdated,
}: {
  task: Task | null
  onClose: () => void
  projects: Project[]
  team: User[]
  cycles: Cycle[]
  milestones: Milestone[]
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
            {edit.cycle && (
              <Badge variant="secondary" className="text-[10px]">
                <Icons.RefreshCw className="mr-0.5 inline h-2.5 w-2.5" />
                {edit.cycle.name}
              </Badge>
            )}
            {edit.milestone && (
              <Badge variant="outline" className="text-[10px]">
                <Icons.Flag className="mr-0.5 inline h-2.5 w-2.5" />
                {edit.milestone.name}
              </Badge>
            )}
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
              <Label className="text-xs uppercase text-muted-foreground">Cycle / Sprint</Label>
              <Select
                value={edit.cycleId || edit.cycle?.id || '__none__'}
                onValueChange={(v) => save({ cycleId: v === '__none__' ? null : v } as Partial<Task>)}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Milestone</Label>
              <Select
                value={edit.milestoneId || edit.milestone?.id || '__none__'}
                onValueChange={(v) => save({ milestoneId: v === '__none__' ? null : v } as Partial<Task>)}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {milestones
                    .filter((m) => m.projectId === (edit.projectId || edit.project?.id))
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
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

          <TaskChecklist taskId={task.id} />

          <TaskWorklogs taskId={task.id} />

          <TaskComments taskId={task.id} />

          <TaskDependencies taskId={task.id} />
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

function AiTaskButton({ projects, team, onCreated }: { projects: Project[]; team: User[]; onCreated: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [input, setInput] = React.useState('')
  const [parsed, setParsed] = React.useState<null | {
    title: string
    description?: string
    priority?: string
    type?: string
    assigneeName?: string
    dueDate?: string
    tags?: string[]
    confidence: string
    rawInterpretation: string
  }>(null)
  const [loading, setLoading] = React.useState(false)
  const [creating, setCreating] = React.useState(false)

  const parse = async () => {
    if (!input.trim()) return
    setLoading(true)
    try {
      const d = await api<{ parsed: NonNullable<typeof parsed> }>('/api/ai/parse-task', {
        method: 'POST',
        body: JSON.stringify({ input: input.trim() }),
      })
      setParsed(d.parsed)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI parse failed')
    } finally { setLoading(false) }
  }

  const create = async () => {
    if (!parsed || !projects[0]) { toast.error('Nothing to create'); return }
    // Match assignee by name
    const matchedAssignee = parsed.assigneeName
      ? team.find((u) => u.name.toLowerCase().includes(parsed.assigneeName!.toLowerCase()))
      : undefined
    setCreating(true)
    try {
      await api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: projects[0].id,
          title: parsed.title,
          description: parsed.description || null,
          priority: parsed.priority || 'medium',
          type: parsed.type || 'task',
          assigneeId: matchedAssignee?.id || null,
          dueDate: parsed.dueDate ? new Date(parsed.dueDate).toISOString() : null,
          tags: parsed.tags?.join(',') || null,
        }),
      })
      toast.success(`AI created: ${parsed.title}`)
      setOpen(false); setInput(''); setParsed(null)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally { setCreating(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-violet-300 text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/20">
          <Icons.Sparkles className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">AI</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.Sparkles className="h-4 w-4 text-violet-600" />
            Natural-language task creation
          </DialogTitle>
          <DialogDescription>
            Describe the task in plain English. AI parses title, priority, type, assignee, due date, and tags.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ai-input">Describe the task</Label>
            <Textarea
              id="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={3}
              placeholder="e.g. Create a high-priority bug for Vikram to fix the iPad crash by Friday, tag it mobile and auth"
              autoFocus
            />
          </div>
          <Button onClick={parse} disabled={loading || !input.trim()} variant="outline" className="w-full">
            {loading ? <><Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parsingâ¦</> : <><Icons.Sparkles className="mr-2 h-4 w-4" /> Parse with AI</>}
          </Button>

          {parsed && (
            <div className="rounded-md border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-muted-foreground">AI interpretation</span>
                <Badge variant="outline" className={cn(
                  'text-[10px] capitalize',
                  parsed.confidence === 'high' ? 'text-emerald-600' :
                  parsed.confidence === 'medium' ? 'text-amber-600' : 'text-slate-500'
                )}>{parsed.confidence} confidence</Badge>
              </div>
              <div className="text-sm font-medium">{parsed.title}</div>
              {parsed.rawInterpretation && <div className="text-xs text-muted-foreground italic">{parsed.rawInterpretation}</div>}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsed.priority && <Badge variant="outline" className="text-[10px] capitalize">{parsed.priority}</Badge>}
                {parsed.type && parsed.type !== 'task' && <Badge variant="outline" className="text-[10px] capitalize">{parsed.type}</Badge>}
                {parsed.assigneeName && <Badge variant="outline" className="text-[10px]">@{parsed.assigneeName}</Badge>}
                {parsed.dueDate && <Badge variant="outline" className="text-[10px]">Due {parsed.dueDate}</Badge>}
                {parsed.tags?.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">#{t}</Badge>)}
              </div>
              {parsed.assigneeName && !team.find((u) => u.name.toLowerCase().includes(parsed.assigneeName!.toLowerCase())) && (
                <div className="text-[10px] text-amber-600">â  No team member matched "{parsed.assigneeName}" â task will be unassigned.</div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={create} disabled={!parsed || creating || !projects[0]}>
            {creating ? <><Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creatingâ¦</> : <>Create task</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
