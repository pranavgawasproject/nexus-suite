'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const EXPORT_MODULES = [
  {
    key: 'all',
    name: 'Full org export',
    description: 'Everything: tasks, projects, rooms, bookings, users, departments, modules, audit logs.',
    icon: 'Boxes',
    color: 'bg-emerald-500',
    size: 'JSON · ~50KB',
  },
  {
    key: 'tasks',
    name: 'Tasks & Projects',
    description: 'All projects, tasks, assignees, priorities, statuses, estimates.',
    icon: 'ListChecks',
    color: 'bg-emerald-500',
    size: 'JSON · CSV',
  },
  {
    key: 'rooms',
    name: 'Rooms & Bookings',
    description: 'Room inventory, amenities, all bookings including recurring instances.',
    icon: 'DoorOpen',
    color: 'bg-amber-500',
    size: 'JSON · CSV',
  },
  {
    key: 'team',
    name: 'Team & Departments',
    description: 'User profiles, roles, designations, department structure.',
    icon: 'Users',
    color: 'bg-violet-500',
    size: 'JSON · CSV',
  },
  {
    key: 'risk',
    name: 'Risk, Issues & Change Requests',
    description: 'Risk register, issue log, change requests — full audit trail.',
    icon: 'ShieldAlert',
    color: 'bg-rose-500',
    size: 'JSON · CSV',
  },
  {
    key: 'governance',
    name: 'Governance Policies & Signatures',
    description: 'Compliance policies (retention, IP allowlist, SSO, etc.) + e-signature audit trail.',
    icon: 'Lock',
    color: 'bg-slate-700',
    size: 'JSON · CSV',
  },
]

export function ExportView() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Export</h1>
        <p className="text-sm text-muted-foreground">
          Your data is yours. Export anytime as JSON or CSV — no lock-in, no cancellation required.
        </p>
      </div>

      <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-900/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Icons.ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
          <div>
            <div className="text-sm font-semibold">GDPR-aligned · portable · always available</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Per PRD §5 — full org data export is available to Org Admins anytime, not just on cancellation.
              JSON exports preserve relational structure; CSV exports flatten the primary entity per module.
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORT_MODULES.map((m) => {
          const Icon = Icons[m.icon as keyof typeof Icons] as Icons.LucideIcon
          return (
            <Card key={m.key}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-white ${m.color}`}>
                    {Icon && <Icon className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{m.name}</CardTitle>
                    <CardDescription className="mt-1">{m.description}</CardDescription>
                    <Badge variant="secondary" className="mt-2 text-[10px]">{m.size}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    window.open(`/api/export?module=${m.key}&format=json`, '_blank')
                    toast.success('JSON export started')
                  }}
                >
                  <Icons.Download className="mr-1.5 h-3.5 w-3.5" /> JSON
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    window.open(`/api/export?module=${m.key}&format=csv`, '_blank')
                    toast.success('CSV export started')
                  }}
                >
                  <Icons.FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> CSV
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
