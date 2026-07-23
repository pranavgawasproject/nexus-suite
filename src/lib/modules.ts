// Central module registry — single source of truth for module metadata.
// Used by sidebar, marketplace, onboarding wizard, and API gatekeepers.

export type ModuleKey =
  | 'tasks'
  | 'rooms'
  | 'reporting'
  | 'kra'
  | 'budget'
  | 'risk'
  | 'collab'
  | 'leave'
  | 'resource'
  | 'governance'

export interface ModuleDef {
  key: ModuleKey
  name: string
  shortName: string
  description: string
  icon: string          // lucide icon name
  phase: 1 | 2 | 3      // PRD phase availability
  tier: 'starter' | 'growth' | 'business' | 'enterprise'
  color: string         // tailwind bg class for accent
  defaultState?: 'trial' | 'active'
}

export const MODULE_REGISTRY: ModuleDef[] = [
  {
    key: 'tasks',
    name: 'Task & Project Management',
    shortName: 'Tasks',
    description: 'Projects, epics, tasks, subtasks. Kanban, list, and calendar views. Sprints, dependencies, recurring tasks, CSV import.',
    icon: 'ListChecks',
    phase: 1,
    tier: 'starter',
    color: 'bg-emerald-500',
    defaultState: 'active',
  },
  {
    key: 'rooms',
    name: 'Meeting Room & Resource Booking',
    shortName: 'Rooms',
    description: 'Room inventory, conflict-free calendar booking, recurring bookings, check-in flow, capacity and amenities.',
    icon: 'DoorOpen',
    phase: 1,
    tier: 'growth',
    color: 'bg-amber-500',
    defaultState: 'active',
  },
  {
    key: 'reporting',
    name: 'Reporting & Analytics',
    shortName: 'Reports',
    description: 'Cross-module dashboards, role-based widgets, scheduled exports. The glue module — felt early.',
    icon: 'BarChart3',
    phase: 1,
    tier: 'growth',
    color: 'bg-rose-500',
    defaultState: 'active',
  },
  {
    key: 'kra',
    name: 'KRA / KPA & Performance',
    shortName: 'KRA/KPA',
    description: 'KRA/KPA definitions, self + manager reviews, calibration, task-evidence linking, PDF export.',
    icon: 'Award',
    phase: 2,
    tier: 'business',
    color: 'bg-violet-500',
  },
  {
    key: 'budget',
    name: 'Budget & Financial Tracking',
    shortName: 'Budget',
    description: 'Project budgets, expense logging, time→cost, multi-currency, GST handling, POs, invoicing.',
    icon: 'Wallet',
    phase: 2,
    tier: 'business',
    color: 'bg-teal-500',
  },
  {
    key: 'risk',
    name: 'Risk & Issue Management',
    shortName: 'Risk',
    description: 'Risk register (likelihood × impact), issue log with escalation, change requests.',
    icon: 'ShieldAlert',
    phase: 3,
    tier: 'business',
    color: 'bg-red-500',
  },
  {
    key: 'collab',
    name: 'Collaboration & Docs',
    shortName: 'Docs',
    description: 'Threaded chat, shared docs/wiki with versioning, @mentions, video conferencing embed.',
    icon: 'MessagesSquare',
    phase: 2,
    tier: 'business',
    color: 'bg-cyan-500',
  },
  {
    key: 'leave',
    name: 'Leave & Attendance',
    shortName: 'Leave',
    description: 'Leave application/approval, balance tracking, attendance, holiday calendar, India-state policy templates.',
    icon: 'CalendarOff',
    phase: 2,
    tier: 'growth',
    color: 'bg-orange-500',
  },
  {
    key: 'resource',
    name: 'Resource & Capacity',
    shortName: 'Resources',
    description: 'Team workload, skill tagging, allocation %, utilization reports.',
    icon: 'Users',
    phase: 2,
    tier: 'business',
    color: 'bg-lime-500',
  },
  {
    key: 'governance',
    name: 'Governance, Compliance & Audit',
    shortName: 'Governance',
    description: 'Advanced audit export (SOC2/ISO-ready), e-signature, data retention, IP allowlisting, SSO enforcement.',
    icon: 'Lock',
    phase: 3,
    tier: 'starter', // free/open-source per PRD v2.1
    color: 'bg-slate-700',
  },
]

export function getModuleDef(key: string): ModuleDef | undefined {
  return MODULE_REGISTRY.find((m) => m.key === key)
}

// Onboarding wizard — recommended module bundles based on "what are you replacing?"
export interface OnboardingBundle {
  id: string
  label: string
  replaces: string
  modules: ModuleKey[]
}

export const ONBOARDING_BUNDLES: OnboardingBundle[] = [
  {
    id: 'pm',
    label: 'Asana / Jira / ClickUp / Trello',
    replaces: 'Project & task management tool',
    modules: ['tasks', 'reporting'],
  },
  {
    id: 'rooms',
    label: 'Robin / Skedda / Outlook rooms',
    replaces: 'Meeting room booking tool',
    modules: ['rooms', 'reporting'],
  },
  {
    id: 'pm-rooms',
    label: 'Asana + Skedda (the classic SME combo)',
    replaces: 'PM + room booking',
    modules: ['tasks', 'rooms', 'reporting'],
  },
  {
    id: 'hr',
    label: 'Keka / Lattice / Zoho People',
    replaces: 'HR / performance tool',
    modules: ['kra', 'leave', 'reporting'],
  },
  {
    id: 'spreadsheet',
    label: 'Excel / Google Sheets',
    replaces: 'Budget & resource tracking spreadsheet',
    modules: ['budget', 'resource', 'reporting'],
  },
  {
    id: 'all-in-one',
    label: 'Multiple tools (3+) — full cleanup',
    replaces: 'Tool sprawl',
    modules: ['tasks', 'rooms', 'kra', 'leave', 'reporting'],
  },
]

export const STARTER_FREE_MODULES: ModuleKey[] = ['tasks']
