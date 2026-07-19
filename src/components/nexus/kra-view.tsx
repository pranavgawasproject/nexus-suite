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
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, initials, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface User { id: string; name: string; email: string; avatarUrl?: string | null; designation?: string | null }
interface Kra {
  id: string
  title: string
  description?: string | null
  cycle: string
  status: string
  weight: number
  targetRating: number
  selfRating?: number | null
  managerRating?: number | null
  selfComment?: string | null
  managerComment?: string | null
  user: User
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  self_review: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  manager_review: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  calibration: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  closed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft',
  self_review: 'Self-review',
  manager_review: 'Manager review',
  calibration: 'Calibration',
  closed: 'Closed',
}

export function KraView() {
  const { isModuleOn } = useAppStore()
  const [kras, setKras] = React.useState<Kra[]>([])
  const [team, setTeam] = React.useState<User[]>([])
  const [filterCycle, setFilterCycle] = React.useState('all')
  const [filterStatus, setFilterStatus] = React.useState('all')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Kra | null>(null)

  const load = React.useCallback(async () => {
    try {
      const [k, t] = await Promise.all([api<{ kras: Kra[] }>('/api/kras'), api<{ team: User[] }>('/api/team')])
      setKras(k.kras)
      setTeam(t.team)
    } catch {}
  }, [])
  React.useEffect(() => { if (isModuleOn('kra')) load() }, [load, isModuleOn])

  if (!isModuleOn('kra')) return <DisabledState />

  const cycles = Array.from(new Set(kras.map((k) => k.cycle)))
  const visible = kras.filter((k) => (filterCycle === 'all' || k.cycle === filterCycle) && (filterStatus === 'all' || k.status === filterStatus))
  const byStatus = kras.reduce((acc, k) => { acc[k.status] = (acc[k.status] || 0) + 1; return acc }, {} as Record<string, number>)

  const updateStatus = async (id: string, status: string) => {
    try { await api('/api/kras', { method: 'PATCH', body: JSON.stringify({ id, status }) }); toast.success(`Moved to ${STATUS_LABEL[status]}`); load() }
    catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KRA / KPA &amp; Performance</h1>
          <p className="text-sm text-muted-foreground">{kras.length} KRAs across {cycles.length} cycle{cycles.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCycle} onValueChange={setFilterCycle}>
            <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Cycle" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cycles</SelectItem>
              {cycles.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <KraDialog open={createOpen} onOpenChange={setCreateOpen} team={team} onCreated={load} />
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <Card key={k}><CardContent className="p-4">
            <div className="text-2xl font-bold">{byStatus[k] || 0}</div>
            <div className="text-xs text-muted-foreground">{v}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {visible.map((k) => (
              <button key={k.id} onClick={() => setEditing(k)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent/40">
                <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{initials(k.user.name)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{k.title}</span>
                    <Badge className={cn('text-[10px]', STATUS_COLORS[k.status])}>{STATUS_LABEL[k.status]}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {k.user.name} · {k.cycle} · weight {k.weight}%
                  </div>
                  {k.description && <div className="mt-1 text-xs line-clamp-1">{k.description}</div>}
                  <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Target: {k.targetRating}/5</span>
                    {k.selfRating && <span>Self: {k.selfRating}/5</span>}
                    {k.managerRating && <span>Manager: {k.managerRating}/5</span>}
                  </div>
                </div>
                <Icons.ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
            {visible.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No KRAs match these filters.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <KraDetailDialog kra={editing} onClose={() => setEditing(null)} onUpdated={load} onStatusChange={updateStatus} />
    </div>
  )
}

function KraDialog({ open, onOpenChange, team, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; team: User[]; onCreated: () => void }) {
  const [userId, setUserId] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [cycle, setCycle] = React.useState(`Q${Math.floor(new Date().getMonth() / 3) + 1}-${new Date().getFullYear()}`)
  const [weight, setWeight] = React.useState(25)
  const [targetRating, setTargetRating] = React.useState(3)

  const submit = async () => {
    if (!userId || !title.trim() || !cycle) { toast.error('User, title and cycle required'); return }
    try {
      await api('/api/kras', { method: 'POST', body: JSON.stringify({ userId, title: title.trim(), description: description.trim() || null, cycle, weight, targetRating }) })
      toast.success('KRA created')
      setTitle(''); setDescription('')
      onOpenChange(false); onCreated()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5 hidden sm:inline">New KRA</span></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create KRA</DialogTitle>
          <DialogDescription>Define a Key Result Area for a team member for a review cycle.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Person</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{team.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cycle">Cycle</Label>
              <Input id="cycle" value={cycle} onChange={(e) => setCycle(e.target.value)} className="mt-1" placeholder="Q3-2026" />
            </div>
          </div>
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Ship Nexus App v1" autoFocus />
          </div>
          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Weight: {weight}%</Label>
              <Slider value={[weight]} onValueChange={(v) => setWeight(v[0])} min={5} max={100} step={5} className="mt-2" />
            </div>
            <div>
              <Label>Target rating: {targetRating}/5</Label>
              <Slider value={[targetRating]} onValueChange={(v) => setTargetRating(v[0])} min={1} max={5} step={1} className="mt-2" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Create KRA</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function KraDetailDialog({ kra, onClose, onUpdated, onStatusChange }: { kra: Kra | null; onClose: () => void; onUpdated: () => void; onStatusChange: (id: string, status: string) => void }) {
  const [edit, setEdit] = React.useState<Kra | null>(kra)
  React.useEffect(() => setEdit(kra), [kra])
  if (!kra || !edit) return null

  const save = async (patch: Partial<Kra>) => {
    setEdit({ ...edit, ...patch })
    try { await api('/api/kras', { method: 'PATCH', body: JSON.stringify({ id: kra.id, ...patch }) }); onUpdated() } catch { toast.error('Failed') }
  }

  return (
    <Dialog open={!!kra} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className={cn('text-[10px]', STATUS_COLORS[edit.status])}>{STATUS_LABEL[edit.status]}</Badge>
            <span className="text-xs text-muted-foreground">{edit.cycle} · {edit.weight}% weight</span>
          </div>
          <DialogTitle className="text-lg">{edit.title}</DialogTitle>
          <DialogDescription>{edit.user.name} · created {formatDate(edit.createdAt)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Description</Label>
            <Textarea value={edit.description || ''} onChange={(e) => setEdit({ ...edit, description: e.target.value })} onBlur={() => save({ description: edit.description })} rows={2} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Self rating: {edit.selfRating || '—'}/5</Label>
              <Slider value={[edit.selfRating || 1]} onValueChange={(v) => setEdit({ ...edit, selfRating: v[0] })} onPointerUp={() => save({ selfRating: edit.selfRating })} min={1} max={5} step={1} className="mt-2" />
            </div>
            <div>
              <Label className="text-xs uppercase text-muted-foreground">Manager rating: {edit.managerRating || '—'}/5</Label>
              <Slider value={[edit.managerRating || 1]} onValueChange={(v) => setEdit({ ...edit, managerRating: v[0] })} onPointerUp={() => save({ managerRating: edit.managerRating })} min={1} max={5} step={1} className="mt-2" />
            </div>
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Self comment</Label>
            <Textarea value={edit.selfComment || ''} onChange={(e) => setEdit({ ...edit, selfComment: e.target.value })} onBlur={() => save({ selfComment: edit.selfComment })} rows={2} className="mt-1" placeholder="Self-assessment notes" />
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Manager comment</Label>
            <Textarea value={edit.managerComment || ''} onChange={(e) => setEdit({ ...edit, managerComment: e.target.value })} onBlur={() => save({ managerComment: edit.managerComment })} rows={2} className="mt-1" placeholder="Manager feedback" />
          </div>
          <div>
            <Label className="text-xs uppercase text-muted-foreground">Move to stage</Label>
            <Select value={edit.status} onValueChange={(v) => { setEdit({ ...edit, status: v }); onStatusChange(kra.id, v) }}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Close</Button>
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
        <h3 className="text-lg font-semibold">KRA / KPA is disabled</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enable this module in the Marketplace.</p>
        <Button className="mt-4" onClick={() => setActiveView('settings')}><Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace</Button>
      </CardContent>
    </Card>
  )
}
