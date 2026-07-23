'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, initials, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface User { id: string; name: string; email: string; avatarUrl?: string | null; designation?: string | null }
interface Project { id: string; name: string; color: string }
interface Allocation {
  id: string
  allocationPct: number
  role?: string | null
  startDate: string
  endDate?: string | null
  userId: string
  user: User
  project: Project
}

export function ResourceView() {
  const { isModuleOn } = useAppStore()
  const [allocations, setAllocations] = React.useState<Allocation[]>([])
  const [team, setTeam] = React.useState<User[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [createOpen, setCreateOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const [a, t, p] = await Promise.all([
        api<{ allocations: Allocation[] }>('/api/allocations'),
        api<{ team: User[] }>('/api/team'),
        api<{ projects: Project[] }>('/api/projects'),
      ])
      setAllocations(a.allocations)
      setTeam(t.team)
      setProjects(p.projects)
    } catch {}
  }, [])
  React.useEffect(() => { if (isModuleOn('resource')) load() }, [load, isModuleOn])

  if (!isModuleOn('resource')) return <DisabledState />

  // Group by user
  const byUser = team.map((u) => {
    const userAllocs = allocations.filter((a) => a.userId === u.id)
    const total = Math.min(100, userAllocs.reduce((s, a) => s + a.allocationPct, 0))
    return { user: u, allocations: userAllocs, total }
  })

  const remove = async (id: string) => {
    try { await api(`/api/allocations?id=${id}`, { method: 'DELETE' }); toast.success('Allocation removed'); load() }
    catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resource &amp; Capacity</h1>
          <p className="text-sm text-muted-foreground">{allocations.length} active allocations across {team.length} people</p>
        </div>
        <AllocationDialog open={createOpen} onOpenChange={setCreateOpen} team={team} projects={projects} onCreated={load} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{allocations.length}</div><div className="text-xs text-muted-foreground">Active allocations</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{byUser.filter((u) => u.total >= 100).length}</div><div className="text-xs text-muted-foreground">Fully allocated</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{byUser.filter((u) => u.total === 0).length}</div><div className="text-xs text-muted-foreground">Unallocated</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{Math.round(byUser.reduce((s, u) => s + u.total, 0) / Math.max(1, byUser.length))}%</div><div className="text-xs text-muted-foreground">Avg utilisation</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team workload</CardTitle>
          <CardDescription>Per-person allocation across projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {byUser.map(({ user, allocations: userAllocs, total }) => (
            <div key={user.id} className="rounded-lg border p-3">
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(user.name)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.designation || '—'}</div>
                </div>
                <Badge variant={total >= 100 ? 'default' : total >= 50 ? 'secondary' : 'outline'} className="tabular-nums">
                  {total}%
                </Badge>
              </div>
              <Progress value={total} className="h-1.5 mb-2" />
              {userAllocs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {userAllocs.map((a) => (
                    <div key={a.id} className="group flex items-center gap-2 rounded-md border bg-card px-2 py-1 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.project.color }} />
                      <span className="font-medium">{a.project.name}</span>
                      <span className="text-muted-foreground">{a.allocationPct}%</span>
                      {a.role && <Badge variant="outline" className="text-[9px]">{a.role}</Badge>}
                      <button onClick={() => remove(a.id)} className="opacity-0 group-hover:opacity-100 text-rose-600 hover:text-rose-700">
                        <Icons.X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No active allocations</div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function AllocationDialog({ open, onOpenChange, team, projects, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; team: User[]; projects: Project[]; onCreated: () => void }) {
  const [userId, setUserId] = React.useState('')
  const [projectId, setProjectId] = React.useState('')
  const [allocationPct, setAllocationPct] = React.useState('50')
  const [role, setRole] = React.useState('')
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date())

  const submit = async () => {
    if (!userId || !projectId || !startDate) { toast.error('All fields required'); return }
    try {
      const s = new Date(startDate); s.setUTCHours(0, 0, 0, 0)
      await api('/api/allocations', { method: 'POST', body: JSON.stringify({ userId, projectId, allocationPct: Number(allocationPct), role: role.trim() || null, startDate: s.toISOString() }) })
      toast.success('Allocation created')
      setRole(''); setAllocationPct('50')
      onOpenChange(false); onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5 hidden sm:inline">Allocate</span></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>New allocation</DialogTitle>
          <DialogDescription>Assign a person to a project with a capacity percentage.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Person</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select person" /></SelectTrigger>
              <SelectContent>
                {team.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</span></SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pct">Allocation %</Label>
              <Input id="pct" type="number" min="0" max="100" value={allocationPct} onChange={(e) => setAllocationPct(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Lead" className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Start date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="mt-1 w-full justify-start font-normal"><Icons.Calendar className="mr-2 h-4 w-4" />{startDate ? formatDate(startDate) : 'Pick'}</Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Create allocation</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DisabledState() {
  const { setActiveView } = useAppStore()
  return (
    <Card>
      <CardContent className="p-12 text-center">
        <Icons.Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Resource &amp; Capacity is disabled</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enable this module in the Marketplace.</p>
        <Button className="mt-4" onClick={() => setActiveView('settings')}><Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace</Button>
      </CardContent>
    </Card>
  )
}
