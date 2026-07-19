'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ModuleKey } from '@/lib/modules'

export type ViewKey =
  | 'dashboard'
  | 'tasks'
  | 'rooms'
  | 'reporting'
  | 'settings'
  | 'onboarding'
  | 'export'
  | 'audit'

export interface OrgState {
  id: string
  name: string
  slug: string
  plan: string
  currency: string
  timezone: string
  onboardingDone: boolean
}

export interface UserState {
  id: string
  email: string
  name: string
  role: string
  designation?: string | null
  avatarUrl?: string | null
  departmentId?: string | null
}

export interface ModuleState {
  moduleKey: string
  state: 'disabled' | 'trial' | 'active' | 'archived'
  enabledAt?: string | null
}

interface AppStore {
  // session
  user: UserState | null
  org: OrgState | null
  modules: ModuleState[]
  activeView: ViewKey
  setActiveView: (v: ViewKey) => void

  // session boot
  hydrate: () => Promise<void>
  setUser: (u: UserState | null) => void
  setOrg: (o: OrgState | null) => void
  setModules: (m: ModuleState[]) => void

  // module helpers
  isModuleOn: (key: ModuleKey) => boolean
  toggleModule: (key: ModuleKey, state: ModuleState['state']) => Promise<void>

  // onboarding
  completeOnboarding: (bundleId: string, moduleKeys: ModuleKey[]) => Promise<void>

  // theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (t: 'light' | 'dark' | 'system') => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      user: null,
      org: null,
      modules: [],
      activeView: 'dashboard',
      theme: 'light',
      setActiveView: (v) => set({ activeView: v }),

      setUser: (u) => set({ user: u }),
      setOrg: (o) => set({ org: o }),
      setModules: (m) => set({ modules: m }),

      setTheme: (t) => set({ theme: t }),

      hydrate: async () => {
        try {
          const res = await fetch('/api/session')
          if (!res.ok) {
            set({ user: null, org: null, modules: [] })
            return
          }
          const data = await res.json()
          set({
            user: data.user ?? null,
            org: data.org ?? null,
            modules: data.modules ?? [],
            activeView: data.org?.onboardingDone ? get().activeView : 'onboarding',
          })
        } catch {
          set({ user: null, org: null, modules: [] })
        }
      },

      isModuleOn: (key) => {
        const m = get().modules.find((x) => x.moduleKey === key)
        return !!m && (m.state === 'active' || m.state === 'trial')
      },

      toggleModule: async (key, newState) => {
        const org = get().org
        if (!org) return
        await fetch('/api/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleKey: key, state: newState }),
        })
        // refresh module list
        const res = await fetch('/api/session')
        const data = await res.json()
        set({ modules: data.modules ?? [] })
      },

      completeOnboarding: async (bundleId, moduleKeys) => {
        await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bundleId, moduleKeys }),
        })
        await get().hydrate()
        set({ activeView: 'dashboard' })
      },
    }),
    {
      name: 'nexus-suite-store',
      partialize: (s) => ({
        theme: s.theme,
        activeView: s.activeView,
      }),
    }
  )
)
