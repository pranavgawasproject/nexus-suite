'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ONBOARDING_BUNDLES, MODULE_REGISTRY, type ModuleKey } from '@/lib/modules'
import { useAppStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function OnboardingWizard() {
  const { completeOnboarding, org } = useAppStore()
  const [step, setStep] = React.useState(0)
  const [selectedBundle, setSelectedBundle] = React.useState<string | null>(null)
  const [chosenModules, setChosenModules] = React.useState<ModuleKey[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  const toggleModule = (key: ModuleKey) => {
    setChosenModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    )
  }

  const selectBundle = (bundleId: string) => {
    setSelectedBundle(bundleId)
    const b = ONBOARDING_BUNDLES.find((x) => x.id === bundleId)
    if (b) setChosenModules(b.modules)
  }

  const finish = async () => {
    if (chosenModules.length === 0) return
    setSubmitting(true)
    try {
      await completeOnboarding(selectedBundle || 'custom', chosenModules)
    } finally {
      setSubmitting(false)
    }
  }

  const steps = ['Welcome', 'What are you replacing?', 'Pick modules', 'Confirm']

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-amber-50/50 dark:from-emerald-950/20 dark:via-background dark:to-amber-950/10">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
        {/* Brand */}
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
            <Icons.Boxes className="h-7 w-7" />
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight">Nexus Suite</div>
            <div className="text-xs text-muted-foreground">Modular enterprise PM</div>
          </div>
        </div>

        {/* Stepper */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                  i < step && 'bg-emerald-600 text-white',
                  i === step && 'bg-emerald-600 text-white ring-4 ring-emerald-100 dark:ring-emerald-950',
                  i > step && 'bg-muted text-muted-foreground'
                )}
              >
                {i < step ? <Icons.Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn('h-0.5 w-8 sm:w-16', i < step ? 'bg-emerald-600' : 'bg-muted')} />
              )}
            </div>
          ))}
        </div>

        <Card className="overflow-hidden border-2 shadow-xl">
          <CardContent className="p-0">
            <AnimatePresence mode="wait">
              {/* STEP 0 — Welcome */}
              {step === 0 && (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="p-8 sm:p-12 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Icons.Sparkles className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Welcome to {org?.name ?? 'Nexus Suite'}, {org && 'Priya'}
                  </h1>
                  <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                    One platform. Toggle only the modules you actually need. Stop paying for 4 tools —
                    replace them with one. We&apos;ll have you set up in under 60 seconds.
                  </p>
                  <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                    {[
                      { icon: 'Boxes', title: 'Modular', text: 'Enable only what you use' },
                      { icon: 'ShieldCheck', title: 'Secure', text: 'Row-level multi-tenancy' },
                      { icon: 'Download', title: 'No lock-in', text: 'Export your data anytime' },
                    ].map((f) => {
                      const I = (Icons as never)[f.icon] as Icons.LucideIcon
                      return (
                        <div key={f.title} className="rounded-lg border bg-card p-4">
                          <I className="mb-2 h-5 w-5 text-emerald-600" />
                          <div className="text-sm font-semibold">{f.title}</div>
                          <div className="text-xs text-muted-foreground">{f.text}</div>
                        </div>
                      )
                    })}
                  </div>
                  <Button size="lg" className="mt-8" onClick={() => setStep(1)}>
                    Get started <Icons.ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              )}

              {/* STEP 1 — What are you replacing? */}
              {step === 1 && (
                <motion.div
                  key="replace"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="p-8 sm:p-10"
                >
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">What are you replacing?</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Pick the tool combo that best matches your current stack. We&apos;ll recommend a
                      module bundle — you can fine-tune next.
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ONBOARDING_BUNDLES.map((b) => {
                      const active = selectedBundle === b.id
                      return (
                        <button
                          key={b.id}
                          onClick={() => selectBundle(b.id)}
                          className={cn(
                            'group flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
                            active
                              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                              : 'border-border hover:border-emerald-300 hover:bg-accent/40'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-lg',
                              active ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <Icons.Replace className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">{b.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{b.replaces}</div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {b.modules.map((m) => {
                                const def = MODULE_REGISTRY.find((x) => x.key === m)
                                return (
                                  <Badge key={m} variant="secondary" className="text-[10px]">
                                    {def?.shortName ?? m}
                                  </Badge>
                                )
                              })}
                            </div>
                          </div>
                          {active && <Icons.CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setStep(0)}>
                      <Icons.ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button
                      onClick={() => setStep(2)}
                      disabled={!selectedBundle}
                    >
                      Continue <Icons.ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2 — Pick modules */}
              {step === 2 && (
                <motion.div
                  key="modules"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="p-8 sm:p-10"
                >
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight">Confirm your modules</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Fine-tune which modules are active. You can change this anytime from the Module Marketplace.
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {chosenModules.length} selected
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {MODULE_REGISTRY.map((m) => {
                      const active = chosenModules.includes(m.key)
                      const Icon = (Icons as never)[m.icon] as Icons.LucideIcon
                      const locked = m.phase > 1
                      return (
                        <button
                          key={m.key}
                          onClick={() => !locked && toggleModule(m.key)}
                          disabled={locked}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all',
                            active
                              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                              : 'border-border hover:border-emerald-300/70',
                            locked && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-white', m.color)}>
                            {Icon && <Icon className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold">{m.shortName}</span>
                              <Badge variant="outline" className="text-[9px] capitalize">{m.tier}</Badge>
                              {locked && (
                                <Badge variant="secondary" className="text-[9px]">Phase {m.phase}</Badge>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{m.description}</div>
                          </div>
                          <div
                            className={cn(
                              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                              active ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-muted-foreground/30'
                            )}
                          >
                            {active && <Icons.Check className="h-3.5 w-3.5" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setStep(1)}>
                      <Icons.ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button onClick={() => setStep(3)} disabled={chosenModules.length === 0}>
                      Review <Icons.ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3 — Confirm */}
              {step === 3 && (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="p-8 sm:p-12 text-center"
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Icons.CheckCircle2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Ready to go</h2>
                  <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                    We&apos;ll activate {chosenModules.length} module{chosenModules.length === 1 ? '' : 's'} and
                    pre-populate a sample workspace so you can explore immediately.
                  </p>

                  <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2">
                    {chosenModules.map((m) => {
                      const def = MODULE_REGISTRY.find((x) => x.key === m)
                      return (
                        <Badge key={m} className="bg-emerald-600 text-white">
                          {def?.shortName ?? m}
                        </Badge>
                      )
                    })}
                  </div>

                  <div className="mx-auto mt-8 max-w-md rounded-lg border bg-card p-4 text-left text-xs text-muted-foreground">
                    <div className="mb-2 font-semibold text-foreground">What we&apos;ll set up for you:</div>
                    <ul className="space-y-1">
                      <li className="flex items-center gap-2">
                        <Icons.Check className="h-3 w-3 text-emerald-600" /> Sample projects &amp; tasks
                      </li>
                      <li className="flex items-center gap-2">
                        <Icons.Check className="h-3 w-3 text-emerald-600" /> Meeting rooms with sample bookings
                      </li>
                      <li className="flex items-center gap-2">
                        <Icons.Check className="h-3 w-3 text-emerald-600" /> Demo team members
                      </li>
                      <li className="flex items-center gap-2">
                        <Icons.Check className="h-3 w-3 text-emerald-600" /> Pre-built reporting dashboard
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => setStep(2)}>
                      <Icons.ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                    <Button size="lg" onClick={finish} disabled={submitting}>
                      {submitting ? (
                        <>
                          <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up…
                        </>
                      ) : (
                        <>
                          Enter my workspace <Icons.ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
