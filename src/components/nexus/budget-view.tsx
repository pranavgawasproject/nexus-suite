'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Project { id: string; name: string; color: string }
interface Budget {
  id: string
  totalAmount: number
  currency: string
  notes?: string | null
  project: Project
  _count?: { expenses: number }
}
interface Expense {
  id: string
  title: string
  amount: number
  currency: string
  category: string
  incurredDate: string
  vendor?: string | null
  notes?: string | null
  project: Project
  incurredBy: { id: string; name: string; email: string }
}

const CATEGORIES = ['software', 'hardware', 'travel', 'meals', 'contractor', 'marketing', 'training', 'other']
const CATEGORY_COLORS: Record<string, string> = {
  software: 'bg-sky-500',
  hardware: 'bg-violet-500',
  travel: 'bg-amber-500',
  meals: 'bg-rose-500',
  contractor: 'bg-emerald-500',
  marketing: 'bg-pink-500',
  training: 'bg-indigo-500',
  other: 'bg-slate-500',
}

const inr = (n: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)

export function BudgetView() {
  const { isModuleOn } = useAppStore()
  const [budgets, setBudgets] = React.useState<Budget[]>([])
  const [expenses, setExpenses] = React.useState<Expense[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [filterProject, setFilterProject] = React.useState('all')
  const [filterCategory, setFilterCategory] = React.useState('all')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [createBudgetOpen, setCreateBudgetOpen] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const [b, e, p] = await Promise.all([
        api<{ budgets: Budget[] }>('/api/budgets'),
        api<{ expenses: Expense[] }>('/api/expenses'),
        api<{ projects: Project[] }>('/api/projects'),
      ])
      setBudgets(b.budgets); setExpenses(e.expenses); setProjects(p.projects)
    } catch {}
  }, [])
  React.useEffect(() => { if (isModuleOn('budget')) load() }, [load, isModuleOn])

  if (!isModuleOn('budget')) return <DisabledState />

  const visibleExpenses = expenses.filter((e) =>
    (filterProject === 'all' || e.projectId === filterProject) &&
    (filterCategory === 'all' || e.category === filterCategory)
  )

  const totalBudget = budgets.reduce((s, b) => s + b.totalAmount, 0)
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Budget &amp; Financial Tracking</h1>
          <p className="text-sm text-muted-foreground">
            {inr(totalSpent)} spent of {inr(totalBudget)} budget · {expenses.length} expenses logged
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreateBudgetOpen(true)}><Icons.Wallet className="h-4 w-4" /><span className="ml-1.5 hidden sm:inline">Set budget</span></Button>
          <ExpenseDialog open={createOpen} onOpenChange={setCreateOpen} projects={projects} onCreated={load} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Budget by project */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Budget vs actual</CardTitle>
            <CardDescription>Per-project burn</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.map((b) => {
              const spent = expenses.filter((e) => e.projectId === b.project.id).reduce((s, e) => s + e.amount, 0)
              const pct = b.totalAmount ? Math.round((spent / b.totalAmount) * 100) : 0
              const over = spent > b.totalAmount
              return (
                <div key={b.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: b.project.color }} />
                      <span className="text-sm font-medium">{b.project.name}</span>
                    </div>
                    <span className="text-xs tabular-nums">
                      {inr(spent, b.currency)} / {inr(b.totalAmount, b.currency)}
                    </span>
                  </div>
                  <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                    <div className={cn('h-full', over ? 'bg-rose-500' : 'bg-emerald-500')} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{pct}% used</span>
                    {over && <span className="text-rose-600 font-medium">Over by {inr(spent - b.totalAmount, b.currency)}</span>}
                    {!over && <span>{inr(b.totalAmount - spent, b.currency)} remaining</span>}
                  </div>
                </div>
              )
            })}
            {budgets.length === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No budgets set.</div>}
          </CardContent>
        </Card>

        {/* Expense by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by category</CardTitle>
            <CardDescription>All-time breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {CATEGORIES.map((cat) => {
                const total = expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)
                const pct = totalSpent ? (total / totalSpent) * 100 : 0
                if (total === 0) return null
                return (
                  <div key={cat}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 capitalize">
                        <span className={cn('h-2 w-2 rounded-full', CATEGORY_COLORS[cat])} />
                        {cat}
                      </span>
                      <span className="tabular-nums">{inr(total)} · {Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn('h-full', CATEGORY_COLORS[cat])} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {totalSpent === 0 && <div className="text-sm text-muted-foreground py-4 text-center">No expenses logged yet.</div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Expense log</CardTitle>
              <CardDescription>{visibleExpenses.length} expenses</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y max-h-[500px] overflow-y-auto scrollbar-thin">
            {visibleExpenses
              .sort((a, b) => new Date(b.incurredDate).getTime() - new Date(a.incurredDate).getTime())
              .map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-white', CATEGORY_COLORS[e.category])}>
                    <Icons.Receipt className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{e.title}</span>
                      <Badge variant="outline" className="text-[9px] capitalize">{e.category}</Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.project.color }} />{e.project.name}</span>
                      {e.vendor && <span>· {e.vendor}</span>}
                      <span>· {formatDate(e.incurredDate)}</span>
                      <span>· by {e.incurredBy.name}</span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums">{inr(e.amount, e.currency)}</div>
                </div>
              ))}
            {visibleExpenses.length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">No expenses match these filters.</div>
            )}
          </div>
        </CardContent>
      </Card>

      <BudgetDialog open={createBudgetOpen} onOpenChange={setCreateBudgetOpen} projects={projects} onCreated={load} />
    </div>
  )
}

function ExpenseDialog({ open, onOpenChange, projects, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; projects: Project[]; onCreated: () => void }) {
  const [projectId, setProjectId] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [category, setCategory] = React.useState('other')
  const [vendor, setVendor] = React.useState('')
  const [incurredDate, setIncurredDate] = React.useState<Date | undefined>(new Date())
  const [notes, setNotes] = React.useState('')

  const submit = async () => {
    if (!projectId || !title.trim() || !amount || !incurredDate) { toast.error('Project, title, amount, and date are required'); return }
    try {
      const d = new Date(incurredDate); d.setUTCHours(12, 0, 0, 0)
      await api('/api/expenses', { method: 'POST', body: JSON.stringify({ projectId, title: title.trim(), amount: Number(amount), category, vendor: vendor.trim() || null, incurredDate: d.toISOString(), notes: notes.trim() || null }) })
      toast.success('Expense logged')
      setTitle(''); setAmount(''); setVendor(''); setNotes('')
      onOpenChange(false); onCreated()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5 hidden sm:inline">Log expense</span></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log expense</DialogTitle>
          <DialogDescription>Record a project expense. INR only for Phase 2 — multi-currency deferred to Phase 3.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />{p.name}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="e.g. Apple Developer Program" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount (INR) *</Label>
              <Input id="amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" placeholder="0" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} className="mt-1" placeholder="e.g. Amazon" />
            </div>
            <div>
              <Label>Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="mt-1 w-full justify-start font-normal"><Icons.Calendar className="mr-2 h-4 w-4" />{incurredDate ? formatDate(incurredDate) : 'Pick'}</Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={incurredDate} onSelect={setIncurredDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Log expense</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BudgetDialog({ open, onOpenChange, projects, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; projects: Project[]; onCreated: () => void }) {
  const [projectId, setProjectId] = React.useState('')
  const [totalAmount, setTotalAmount] = React.useState('')
  const [notes, setNotes] = React.useState('')

  const submit = async () => {
    if (!projectId || !totalAmount) { toast.error('Project and amount required'); return }
    try {
      await api('/api/budgets', { method: 'POST', body: JSON.stringify({ projectId, totalAmount: Number(totalAmount), currency: 'INR', notes: notes.trim() || null }) })
      toast.success('Budget set')
      setTotalAmount(''); setNotes('')
      onOpenChange(false); onCreated()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Set project budget</DialogTitle>
          <DialogDescription>Overrides any existing budget for this project.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="total">Total budget (INR)</Label>
            <Input id="total" type="number" min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="mt-1" placeholder="500000" autoFocus />
          </div>
          <div>
            <Label htmlFor="bnotes">Notes</Label>
            <Textarea id="bnotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save budget</Button>
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
        <h3 className="text-lg font-semibold">Budget is disabled</h3>
        <p className="mt-1 text-sm text-muted-foreground">Enable this module in the Marketplace.</p>
        <Button className="mt-4" onClick={() => setActiveView('settings')}><Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace</Button>
      </CardContent>
    </Card>
  )
}
