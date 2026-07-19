'use client'

import * as React from 'react'
import dynamic from 'next/dynamic'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { useAppStore } from '@/lib/store'

// Lazy-load heavy view modules to keep the initial bundle small.
// recharts (Dashboard/Reporting), dnd-kit (Tasks), framer-motion (Onboarding) are
// only fetched when the corresponding view is actually opened.
const OnboardingWizard = dynamic(
  () => import('./onboarding-wizard').then((m) => m.OnboardingWizard),
  { ssr: false }
)
const DashboardView = dynamic(
  () => import('./dashboard-view').then((m) => m.DashboardView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const TasksView = dynamic(
  () => import('./tasks-view').then((m) => m.TasksView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const RoomsView = dynamic(
  () => import('./rooms-view').then((m) => m.RoomsView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const ReportingView = dynamic(
  () => import('./reporting-view').then((m) => m.ReportingView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const LeaveView = dynamic(
  () => import('./leave-view').then((m) => m.LeaveView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const ResourceView = dynamic(
  () => import('./resource-view').then((m) => m.ResourceView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const KraView = dynamic(
  () => import('./kra-view').then((m) => m.KraView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const BudgetView = dynamic(
  () => import('./budget-view').then((m) => m.BudgetView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const SettingsView = dynamic(
  () => import('./settings-view').then((m) => m.SettingsView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const ExportView = dynamic(
  () => import('./export-view').then((m) => m.ExportView),
  { ssr: false, loading: () => <ViewLoading /> }
)
const AuditView = dynamic(
  () => import('./audit-view').then((m) => m.AuditView),
  { ssr: false, loading: () => <ViewLoading /> }
)

function ViewLoading() {
  return (
    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
      <div className="animate-pulse">Loading…</div>
    </div>
  )
}

export function AppShell() {
  const { activeView, org, hydrate, user, modules } = useAppStore()
  const [booted, setBooted] = React.useState(false)
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  React.useEffect(() => {
    hydrate().finally(() => setBooted(true))
  }, [hydrate])

  if (!booted) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading workspace…</div>
      </div>
    )
  }

  // Onboarding gate
  if (org && !org.onboardingDone) {
    return <OnboardingWizard />
  }
  if (!org || !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
        <div className="text-lg font-semibold">Unable to load workspace</div>
        <button
          onClick={() => hydrate()}
          className="text-sm text-emerald-600 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block w-64 shrink-0 border-r">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </div>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <Sidebar onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar onOpenSidebar={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 lg:p-6">
          <div className="mx-auto max-w-7xl">
            {activeView === 'dashboard' && <DashboardView />}
            {activeView === 'tasks' && <TasksView />}
            {activeView === 'rooms' && <RoomsView />}
            {activeView === 'reporting' && <ReportingView />}
            {activeView === 'leave' && <LeaveView />}
            {activeView === 'resource' && <ResourceView />}
            {activeView === 'kra' && <KraView />}
            {activeView === 'budget' && <BudgetView />}
            {activeView === 'settings' && <SettingsView />}
            {activeView === 'export' && <ExportView />}
            {activeView === 'audit' && <AuditView />}
          </div>
        </main>
        <footer className="mt-auto border-t bg-muted/30 px-4 lg:px-6 py-3">
          <div className="mx-auto max-w-7xl flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Nexus Suite v0.1 · {modules.filter((m) => m.state === 'active' || m.state === 'trial').length}/{modules.length} modules active
            </span>
            <span>Phase 1 MVP · {new Date().getFullYear()}</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
