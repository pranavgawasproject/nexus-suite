'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, initials, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface User { id: string; name: string; email: string; avatarUrl?: string | null }
interface Project { id: string; name: string; color: string }
interface Risk {
  id: string
  title: string
  description?: string | null
  category: string
  likelihood: number
  impact: number
  severity: number
  status: string
  mitigation?: string | null
  dueDate?: string | null
  owner?: User | null
  project?: Project | null
}
interface Issue {
  id: string
  title: string
  description?: string | null
  severity: string
  status: string
  escalationLevel: number
  dueDate?: string | null
  reporter?: User | null
  assignee?: User | null
  project?: Project | null
}
interface ChangeRequest {
  id: string
  title: string
  description?: string | null
  type: string
  status: string
  impactAssessment?: string | null
  implementationNotes?: string | null
  dueDate?: string | null
  requestedBy?: User | null
  project?: Project | null
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  mitigating: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  monitoring: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  accepted: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  implemented: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  in_progress: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
}

function severityColor(sev: number): string {
  if (sev >= 16) return 'bg-rose-500 text-white'
  if (sev >= 10) return 'bg-amber-500 text-white'
  if (sev >= 5) return 'bg-sky-500 text-white'
  return 'bg-slate-400 text-white'
}
function severityLabel(sev: number): string {
  if (sev >= 16) return 'Critical'
  if (sev >= 10) return 'High'
  if (sev >= 5) return 'Medium'
  return 'Low'
}

export function RiskView() {
  const { isModuleOn, setActiveView } = useAppStore()
  const [tab, setTab] = React.useState<'risks' | 'issues' | 'crs'>('risks')
  const [risks, setRisks] = React.useState<Risk[]>([])
  const [issues, setIssues] = React.useState<Issue[]>([])
  const [crs, setCrs] = React.useState<ChangeRequest[]>([])
  const [team, setTeam] = React.useState<User[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])

  const load = React.useCallback(async () => {
    try {
      const [r, i, c, t, p] = await Promise.all([
        api<{ risks: Risk[] }>('/api/risks'),
        api<{ issues: Issue[] }>('/api/issues'),
        api<{ changeRequests: ChangeRequest[] }>('/api/change-requests'),
        api<{ team: User[] }>('/api/team'),
        api<{ projects: Project[] }>('/api/projects'),
      ])
      setRisks(r.risks); setIssues(i.issues); setCrs(c.changeRequests); setTeam(t.team); setProjects(p.projects)
    } catch {}
  }, [])
  React.useEffect(() => { if (isModuleOn('risk')) load() }, [load, isModuleOn])

  if (!isModuleOn('risk')) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icons.Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Risk &amp; Issue Management is disabled</h3>
          <Button className="mt-4" onClick={() => setActiveView('settings')}><Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace</Button>
        </CardContent>
      </Card>
    )
  }

  const openRisks = risks.filter((r) => r.status === 'open' || r.status === 'mitigating').length
  const criticalRisks = risks.filter((r) => r.severity >= 16).length
  const openIssues = issues.filter((i) => i.status === 'open' || i.status === 'in_progress').length
  const pendingCRs = crs.filter((c) => c.status === 'pending').length

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Risk &amp; Issue Management</h1>
        <p className="text-sm text-muted-foreground">
          {openRisks} open risks · {criticalRisks} critical · {openIssues} open issues · {pendingCRs} pending change requests
        </p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-rose-600">{criticalRisks}</div><div className="text-xs text-muted-foreground">Critical risks</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{openRisks}</div><div className="text-xs text-muted-foreground">Open risks</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-amber-600">{openIssues}</div><div className="text-xs text-muted-foreground">Open issues</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{pendingCRs}</div><div className="text-xs text-muted-foreground">Pending change requests</div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="risks">Risk Register ({risks.length})</TabsTrigger>
          <TabsTrigger value="issues">Issue Log ({issues.length})</TabsTrigger>
          <TabsTrigger value="crs">Change Requests ({crs.length})</TabsTrigger>
        </TabsList>

        {/* RISKS */}
        <TabsContent value="risks" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Risk Register</CardTitle>
                <CardDescription>Likelihood × Impact = Severity (1-25)</CardDescription>
              </div>
              <CreateRiskDialog team={team} projects={projects} onCreated={load} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
                {risks.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={cn('flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg', severityColor(r.severity))}>
                      <span className="text-xs font-bold leading-none">{r.severity}</span>
                      <span className="text-[8px] uppercase opacity-80">{severityLabel(r.severity)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{r.title}</span>
                        <Badge className={cn('text-[10px] capitalize', STATUS_COLORS[r.status])}>{r.status}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{r.category}</Badge>
                      </div>
                      {r.description && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{r.description}</div>}
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>L:{r.likelihood} × I:{r.impact}</span>
                        {r.project && <span style={{ color: r.project.color }}>● {r.project.name}</span>}
                        {r.dueDate && <span>Due {formatDate(r.dueDate, { day: '2-digit', month: 'short' })}</span>}
                        {r.owner && (
                          <span className="flex items-center gap-1">
                            <Avatar className="h-3.5 w-3.5"><AvatarFallback className="text-[7px]">{initials(r.owner.name)}</AvatarFallback></Avatar>
                            {r.owner.name.split(' ')[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {risks.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No risks logged.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ISSUES */}
        <TabsContent value="issues" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Issue Log</CardTitle>
                <CardDescription>With escalation levels (L1/L2/L3)</CardDescription>
              </div>
              <CreateIssueDialog team={team} projects={projects} onCreated={load} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
                {issues.map((i) => (
                  <div key={i.id} className="flex items-start gap-3 px-4 py-3">
                    <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg',
                      i.severity === 'critical' ? 'bg-rose-500 text-white' :
                      i.severity === 'high' ? 'bg-amber-500 text-white' :
                      i.severity === 'medium' ? 'bg-sky-500 text-white' : 'bg-slate-400 text-white')}>
                      <Icons.AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{i.title}</span>
                        <Badge className={cn('text-[10px] capitalize', STATUS_COLORS[i.status])}>{i.status.replace('_', ' ')}</Badge>
                        <Badge variant="outline" className={cn('text-[10px] capitalize',
                          i.severity === 'critical' ? 'text-rose-600' :
                          i.severity === 'high' ? 'text-amber-600' : '')}>{i.severity}</Badge>
                        {i.escalationLevel > 0 && (
                          <Badge variant="secondary" className="text-[10px]">L{i.escalationLevel} escalation</Badge>
                        )}
                      </div>
                      {i.description && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{i.description}</div>}
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                        {i.project && <span style={{ color: i.project.color }}>● {i.project.name}</span>}
                        {i.assignee && <span>→ {i.assignee.name.split(' ')[0]}</span>}
                        {i.dueDate && <span>Due {formatDate(i.dueDate, { day: '2-digit', month: 'short' })}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {issues.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No issues logged.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CHANGE REQUESTS */}
        <TabsContent value="crs" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Change Requests</CardTitle>
                <CardDescription>Track and approve/reject changes</CardDescription>
              </div>
              <CreateCRDialog projects={projects} onCreated={load} />
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {crs.map((c) => (
                  <CRRow key={c.id} cr={c} onDecide={load} />
                ))}
                {crs.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">No change requests.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CRRow({ cr, onDecide }: { cr: ChangeRequest; onDecide: () => void }) {
  const decide = async (status: 'approved' | 'rejected' | 'implemented') => {
    try {
      await api('/api/change-requests', { method: 'PATCH', body: JSON.stringify({ id: cr.id, status }) })
      toast.success(`Change request ${status}`)
      onDecide()
    } catch { toast.error('Failed') }
  }
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
        <Icons.GitPullRequest className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{cr.title}</span>
          <Badge className={cn('text-[10px]', STATUS_COLORS[cr.status])}>{cr.status}</Badge>
          <Badge variant="outline" className={cn('text-[10px] capitalize',
            cr.type === 'emergency' ? 'text-rose-600' :
            cr.type === 'major' ? 'text-amber-600' : '')}>{cr.type}</Badge>
        </div>
        {cr.description && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{cr.description}</div>}
        <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
          {cr.project && <span style={{ color: cr.project.color }}>● {cr.project.name}</span>}
          {cr.requestedBy && <span>by {cr.requestedBy.name}</span>}
          {cr.dueDate && <span>Due {formatDate(cr.dueDate, { day: '2-digit', month: 'short' })}</span>}
        </div>
      </div>
      {cr.status === 'pending' && (
        <div className="flex gap-1">
          <Button size="sm" variant="default" className="h-7 bg-emerald-600" onClick={() => decide('approved')}>
            <Icons.Check className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-rose-600" onClick={() => decide('rejected')}>
            <Icons.X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

function CreateRiskDialog({ team, projects, onCreated }: { team: User[]; projects: Project[]; onCreated: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [category, setCategory] = React.useState('operational')
  const [likelihood, setLikelihood] = React.useState(3)
  const [impact, setImpact] = React.useState(3)
  const [projectId, setProjectId] = React.useState('')
  const [ownerId, setOwnerId] = React.useState('')
  const [mitigation, setMitigation] = React.useState('')

  const submit = async () => {
    if (!title.trim()) { toast.error('Title required'); return }
    try {
      await api('/api/risks', { method: 'POST', body: JSON.stringify({
        title: title.trim(), description: description.trim() || null,
        category, likelihood, impact,
        projectId: projectId || null, ownerId: ownerId || null,
        mitigation: mitigation.trim() || null,
      })})
      toast.success(`Risk created — severity ${likelihood * impact}`)
      setTitle(''); setDescription(''); setMitigation('')
      setOpen(false); onCreated()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5">New risk</span></Button></DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log a risk</DialogTitle>
          <DialogDescription>Severity = likelihood × impact (1-25)</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="rt">Title *</Label>
            <Input id="rt" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="rd">Description</Label>
            <Textarea id="rd" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['operational', 'financial', 'strategic', 'compliance', 'technical', 'external'].map((c) =>
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Likelihood: {likelihood}/5</Label>
              <Slider value={[likelihood]} onValueChange={(v) => setLikelihood(v[0])} min={1} max={5} step={1} className="mt-2" />
            </div>
            <div>
              <Label>Impact: {impact}/5</Label>
              <Slider value={[impact]} onValueChange={(v) => setImpact(v[0])} min={1} max={5} step={1} className="mt-2" />
            </div>
          </div>
          <div className="rounded-md bg-muted p-2 text-center text-sm">
            Severity: <span className={cn('font-bold',
              likelihood * impact >= 16 ? 'text-rose-600' :
              likelihood * impact >= 10 ? 'text-amber-600' : 'text-sky-600')}>
              {likelihood * impact} ({severityLabel(likelihood * impact)})
            </span>
          </div>
          <div>
            <Label>Owner</Label>
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {team.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="rm">Mitigation plan</Label>
            <Textarea id="rm" value={mitigation} onChange={(e) => setMitigation(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Create risk</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateIssueDialog({ team, projects, onCreated }: { team: User[]; projects: Project[]; onCreated: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [severity, setSeverity] = React.useState('medium')
  const [projectId, setProjectId] = React.useState('')
  const [assigneeId, setAssigneeId] = React.useState('')

  const submit = async () => {
    if (!title.trim()) { toast.error('Title required'); return }
    try {
      await api('/api/issues', { method: 'POST', body: JSON.stringify({
        title: title.trim(), description: description.trim() || null,
        severity, projectId: projectId || null, assigneeId: assigneeId || null,
      })})
      toast.success('Issue logged')
      setTitle(''); setDescription('')
      setOpen(false); onCreated()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5">New issue</span></Button></DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader><DialogTitle>Log an issue</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="it">Title *</Label>
            <Input id="it" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="id">Description</Label>
            <Textarea id="id" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['low', 'medium', 'high', 'critical'].map((s) =>
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Unassigned" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {team.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Log issue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CreateCRDialog({ projects, onCreated }: { projects: Project[]; onCreated: () => void }) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [type, setType] = React.useState('minor')
  const [projectId, setProjectId] = React.useState('')
  const [impactAssessment, setImpactAssessment] = React.useState('')

  const submit = async () => {
    if (!title.trim()) { toast.error('Title required'); return }
    try {
      await api('/api/change-requests', { method: 'POST', body: JSON.stringify({
        title: title.trim(), description: description.trim() || null,
        type, projectId: projectId || null,
        impactAssessment: impactAssessment.trim() || null,
      })})
      toast.success('Change request submitted')
      setTitle(''); setDescription(''); setImpactAssessment('')
      setOpen(false); onCreated()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5">New CR</span></Button></DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader><DialogTitle>Submit change request</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ct">Title *</Label>
            <Input id="ct" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <Label htmlFor="cd">Description</Label>
            <Textarea id="cd" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="ci">Impact assessment</Label>
            <Textarea id="ci" value={impactAssessment} onChange={(e) => setImpactAssessment(e.target.value)} rows={2} placeholder="What systems/teams will be affected?" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Submit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
