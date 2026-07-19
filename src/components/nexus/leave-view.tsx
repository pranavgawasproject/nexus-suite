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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, initials, formatDate, formatDateTime } from '@/lib/api'
import { cn } from '@/lib/utils'

interface User { id: string; name: string; email: string; avatarUrl?: string | null; designation?: string | null }
interface Leave {
  id: string
  type: string
  startDate: string
  endDate: string
  halfDay: boolean
  status: string
  reason?: string | null
  approverNote?: string | null
  appliedAt: string
  user: User
  approver?: { id: string; name: string } | null
}
interface Attendance {
  id: string
  date: string
  checkIn?: string | null
  checkOut?: string | null
  workMode: string
  user: User
}
interface Holiday { id: string; name: string; date: string; optional: boolean }

const LEAVE_TYPES = ['casual', 'sick', 'earned', 'comp_off', 'maternity', 'paternity', 'unpaid', 'work_from_home']
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export function LeaveView() {
  const { isModuleOn, user } = useAppStore()
  const [leaves, setLeaves] = React.useState<Leave[]>([])
  const [attendance, setAttendance] = React.useState<Attendance[]>([])
  const [holidays, setHolidays] = React.useState<Holiday[]>([])
  const [team, setTeam] = React.useState<User[]>([])
  const [filter, setFilter] = React.useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [tab, setTab] = React.useState<'leaves' | 'attendance' | 'holidays'>('leaves')

  const load = React.useCallback(async () => {
    try {
      const [l, a, h, t] = await Promise.all([
        api<{ leaves: Leave[] }>('/api/leaves'),
        api<{ attendance: Attendance[] }>('/api/attendance'),
        api<{ holidays: Holiday[] }>('/api/holidays'),
        api<{ team: User[] }>('/api/team'),
      ])
      setLeaves(l.leaves)
      setAttendance(a.attendance)
      setHolidays(h.holidays)
      setTeam(t.team)
    } catch {}
  }, [])

  React.useEffect(() => {
    if (isModuleOn('leave')) load()
  }, [load, isModuleOn])

  if (!isModuleOn('leave')) return <DisabledState />

  const filteredLeaves = filter === 'all' ? leaves : leaves.filter((l) => l.status === filter)

  const decide = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await api('/api/leaves', { method: 'PATCH', body: JSON.stringify({ id, status }) })
      toast.success(`Leave ${status}`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  const checkIn = async () => {
    if (!user) return
    try {
      await api('/api/attendance', { method: 'POST', body: JSON.stringify({ userId: user.id, action: 'check_in' }) })
      toast.success('Checked in')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }
  const checkOut = async () => {
    if (!user) return
    try {
      await api('/api/attendance', { method: 'POST', body: JSON.stringify({ userId: user.id, action: 'check_out' }) })
      toast.success('Checked out')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  const pending = leaves.filter((l) => l.status === 'pending').length
  const onLeaveToday = leaves.filter((l) => {
    const now = new Date()
    return new Date(l.startDate) <= now && new Date(l.endDate) >= now && l.status === 'approved'
  }).length
  const checkedInToday = attendance.filter((a) => {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    return a.date === today.toISOString() && a.checkIn
  }).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leave &amp; Attendance</h1>
          <p className="text-sm text-muted-foreground">{pending} pending approvals · {onLeaveToday} on leave today · {checkedInToday} checked in</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={checkIn}><Icons.LogIn className="h-4 w-4 mr-1.5" /> Check in</Button>
          <Button variant="outline" size="sm" onClick={checkOut}><Icons.LogOut className="h-4 w-4 mr-1.5" /> Check out</Button>
          <LeaveDialog open={createOpen} onOpenChange={setCreateOpen} team={team} onCreated={load} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="leaves">Leave requests</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="leaves" className="space-y-4 mt-4">
          <div className="flex gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">
                {f}
              </Button>
            ))}
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
                {filteredLeaves.map((l) => (
                  <div key={l.id} className="flex items-start gap-3 px-4 py-3">
                    <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{initials(l.user.name)}</AvatarFallback></Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{l.user.name}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">{l.type.replace('_', ' ')}</Badge>
                        <Badge className={cn('text-[10px] capitalize', STATUS_COLORS[l.status])}>{l.status}</Badge>
                        {l.halfDay && <Badge variant="secondary" className="text-[10px]">Half day</Badge>}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(l.startDate)} → {formatDate(l.endDate)}
                      </div>
                      {l.reason && <div className="mt-1 text-xs">“{l.reason}”</div>}
                      {l.approverNote && <div className="mt-1 text-xs italic text-muted-foreground">Note: {l.approverNote}</div>}
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        Applied {formatDate(l.appliedAt)}
                        {l.approver && ` · by ${l.approver.name}`}
                      </div>
                    </div>
                    {l.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="default" className="h-7 bg-emerald-600" onClick={() => decide(l.id, 'approved')}>
                          <Icons.Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-rose-600" onClick={() => decide(l.id, 'rejected')}>
                          <Icons.X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
                {filteredLeaves.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">No leave requests.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent attendance</CardTitle>
              <CardDescription>Last 200 check-ins/check-outs</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
                {attendance.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(a.user.name)}</AvatarFallback></Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{a.user.name}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(a.date)}</div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {a.checkIn ? (
                        <span className="flex items-center gap-1"><Icons.LogIn className="h-3 w-3 text-emerald-600" /> {formatDateTime(a.checkIn)}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                      {a.checkOut ? (
                        <span className="flex items-center gap-1"><Icons.LogOut className="h-3 w-3 text-rose-600" /> {formatDateTime(a.checkOut)}</span>
                      ) : <span className="text-muted-foreground">—</span>}
                      <Badge variant="outline" className="text-[10px] capitalize">{a.workMode}</Badge>
                    </div>
                  </div>
                ))}
                {attendance.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">No attendance records.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Holiday calendar</CardTitle>
              <CardDescription>Organisation holidays</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {holidays.map((h) => (
                  <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      <span className="text-[9px] font-semibold uppercase">{new Date(h.date).toLocaleDateString('en-IN', { month: 'short' })}</span>
                      <span className="text-sm font-bold leading-none">{new Date(h.date).getDate()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{h.name}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(h.date)}</div>
                    </div>
                    {h.optional && <Badge variant="secondary" className="text-[10px]">Optional</Badge>}
                  </div>
                ))}
                {holidays.length === 0 && (
                  <div className="py-12 text-center text-sm text-muted-foreground">No holidays configured.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function LeaveDialog({ open, onOpenChange, team, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; team: User[]; onCreated: () => void }) {
  const { user } = useAppStore()
  const [userId, setUserId] = React.useState(user?.id || '')
  const [type, setType] = React.useState('casual')
  const [startDate, setStartDate] = React.useState<Date | undefined>(new Date())
  const [endDate, setEndDate] = React.useState<Date | undefined>(new Date())
  const [halfDay, setHalfDay] = React.useState(false)
  const [reason, setReason] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => { if (open && user) setUserId(user.id) }, [open, user])

  const submit = async () => {
    if (!userId || !startDate || !endDate) { toast.error('User and dates required'); return }
    setSubmitting(true)
    try {
      const s = new Date(startDate); s.setUTCHours(0, 0, 0, 0)
      const e = new Date(endDate); e.setUTCHours(23, 59, 59, 0)
      await api('/api/leaves', { method: 'POST', body: JSON.stringify({ userId, type, startDate: s.toISOString(), endDate: e.toISOString(), halfDay, reason: reason.trim() || null }) })
      toast.success('Leave request submitted')
      setReason(''); setHalfDay(false)
      onOpenChange(false); onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    } finally { setSubmitting(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5 hidden sm:inline">Apply leave</span></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>Submit a leave request. Your reporting manager will be notified for approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Apply as</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {team.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Leave type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-1 w-full justify-start font-normal"><Icons.Calendar className="mr-2 h-4 w-4" />{startDate ? formatDate(startDate) : 'Pick'}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-1 w-full justify-start font-normal"><Icons.Calendar className="mr-2 h-4 w-4" />{endDate ? formatDate(endDate) : 'Pick'}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Brief reason for leave" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={halfDay} onChange={(e) => setHalfDay(e.target.checked)} className="rounded" />
            Half-day leave
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>{submitting && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit request</Button>
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
        <h3 className="text-lg font-semibold">Leave &amp; Attendance is disabled</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enable this module in the Marketplace.</p>
        <Button className="mt-4" onClick={() => setActiveView('settings')}><Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace</Button>
      </CardContent>
    </Card>
  )
}
