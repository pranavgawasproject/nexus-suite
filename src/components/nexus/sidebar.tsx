'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import Link from 'next/link'
import { useAppStore, type ViewKey } from '@/lib/store'
import { MODULE_REGISTRY, type ModuleKey } from '@/lib/modules'
import { cn } from '@/lib/utils'

interface NavItem {
  view: ViewKey
  label: string
  icon: keyof typeof Icons
  moduleKey?: ModuleKey
  badge?: number
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { activeView, setActiveView, isModuleOn, modules, user, org } = useAppStore()

  const coreNav: NavItem[] = [
    { view: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  ]

  const moduleNav: NavItem[] = MODULE_REGISTRY.filter((m) =>
    ['tasks', 'rooms', 'reporting', 'leave', 'resource', 'kra', 'budget', 'collab'].includes(m.key)
  ).map((m) => ({
    // Module key 'collab' maps to view 'docs' (only docs are built for Phase 2)
    view: (m.key === 'collab' ? 'docs' : m.key) as ViewKey,
    label: m.shortName,
    icon: m.icon as keyof typeof Icons,
    moduleKey: m.key,
  }))

  const settingsNav: NavItem[] = [
    { view: 'settings', label: 'Module Marketplace', icon: 'Store' },
    { view: 'apikeys', label: 'API Keys & Webhooks', icon: 'KeyRound' },
    { view: 'export', label: 'Data Export', icon: 'Download' },
    { view: 'audit', label: 'Audit Log', icon: 'History' },
  ]

  const renderItem = (item: NavItem) => {
    const Icon = Icons[item.icon] as Icons.LucideIcon | undefined
    if (!Icon) return null
    if (item.moduleKey && !isModuleOn(item.moduleKey)) return null

    const active = activeView === item.view
    return (
      <button
        key={item.view}
        onClick={() => {
          setActiveView(item.view)
          onNavigate?.()
        }}
        className={cn(
          'group w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')} />
        <span className="truncate">{item.label}</span>
      </button>
    )
  }

  return (
    <aside className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-sm">
          <Icons.Boxes className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-sidebar-foreground">Nexus Suite</div>
          <div className="truncate text-xs text-sidebar-foreground/60">{org?.name ?? 'Loading…'}</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-6">
        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Overview
          </div>
          {coreNav.map(renderItem)}
        </div>

        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Modules
          </div>
          {moduleNav.map(renderItem)}
          {moduleNav.every((i) => i.moduleKey && !isModuleOn(i.moduleKey)) && (
            <div className="px-3 py-2 text-xs text-sidebar-foreground/50">
              No modules enabled.{' '}
              <button
                onClick={() => setActiveView('settings')}
                className="text-sidebar-primary underline-offset-2 hover:underline"
              >
                Enable some →
              </button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
            Admin
          </div>
          {settingsNav.map(renderItem)}
        </div>
      </nav>

      {/* User card */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-sidebar-foreground">{user?.name ?? '—'}</div>
            <div className="truncate text-xs text-sidebar-foreground/60">
              {user?.designation || user?.role}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between px-2">
          <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40">
            {org?.plan} plan
          </span>
          <Link
            href="https://github.com/pranavgawasproject/nexus-suite"
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-sidebar-foreground/40 hover:text-sidebar-foreground"
          >
            v0.1 · PRD v2
          </Link>
        </div>
      </div>
    </aside>
  )
}
