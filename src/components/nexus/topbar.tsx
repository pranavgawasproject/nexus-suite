'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { api, relativeTime } from '@/lib/api'

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle?: string
  view: string
}

interface NotificationItem {
  id: string
  title: string
  body: string
  category: string
  severity: string
  readAt: string | null
  link: string | null
  createdAt: string
}

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const { user, setActiveView } = useAppStore()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([])
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unread, setUnread] = React.useState(0)
  const [notifOpen, setNotifOpen] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Load notifications
  const loadNotifs = React.useCallback(async () => {
    try {
      const data = await api<{ notifications: NotificationItem[]; unread: number }>('/api/notifications')
      setNotifications(data.notifications)
      setUnread(data.unread)
    } catch {
      // ignore
    }
  }, [])
  React.useEffect(() => {
    loadNotifs()
    const t = setInterval(loadNotifs, 30000)
    return () => clearInterval(t)
  }, [loadNotifs])

  // Search
  React.useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults([])
      return
    }
    const t = setTimeout(async () => {
      try {
        const data = await api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(data.results)
        setSearchOpen(true)
      } catch {
        // ignore
      }
    }, 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  const markAllRead = async () => {
    await api('/api/notifications', { method: 'PATCH', body: JSON.stringify({ markAllRead: true }) })
    loadNotifs()
  }

  const severityColor = (s: string) => {
    switch (s) {
      case 'warning':
        return 'bg-amber-500'
      case 'error':
        return 'bg-rose-500'
      case 'success':
        return 'bg-emerald-500'
      default:
        return 'bg-sky-500'
    }
  }

  const resultIcon = (type: string) => {
    switch (type) {
      case 'task':
        return <Icons.ListChecks className="h-4 w-4 text-emerald-500" />
      case 'project':
        return <Icons.FolderKanban className="h-4 w-4 text-emerald-500" />
      case 'room':
        return <Icons.DoorOpen className="h-4 w-4 text-amber-500" />
      case 'booking':
        return <Icons.CalendarClock className="h-4 w-4 text-amber-500" />
      case 'person':
        return <Icons.User className="h-4 w-4 text-violet-500" />
      default:
        return <Icons.Search className="h-4 w-4" />
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <Icons.Menu className="h-5 w-5" />
      </Button>

      {/* Global search */}
      <div className="relative flex-1 max-w-xl">
        <Icons.Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
          placeholder="Search tasks, projects, rooms, people…"
          className="pl-9 pr-3 h-10"
        />
        {searchOpen && searchResults.length > 0 && (
          <div
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-lg border bg-popover shadow-lg"
            onMouseLeave={() => setSearchOpen(false)}
          >
            <ScrollArea className="max-h-80">
              <div className="p-1">
                {searchResults.map((r) => (
                  <button
                    key={`${r.type}-${r.id}`}
                    onClick={() => {
                      setActiveView(r.view as never)
                      setSearchOpen(false)
                      setSearchQuery('')
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    {resultIcon(r.type)}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.title}</div>
                      {r.subtitle && <div className="truncate text-xs text-muted-foreground">{r.subtitle}</div>}
                    </div>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Icons.Bell className="h-4 w-4" />
              {unread > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-sm font-semibold">Notifications</div>
              {unread > 0 && (
                <button onClick={markAllRead} className="text-xs text-emerald-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <ScrollArea className="max-h-96">
              <div className="divide-y">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (n.link) setActiveView(n.link as never)
                        setNotifOpen(false)
                      }}
                      className={cn(
                        'flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent',
                        !n.readAt && 'bg-emerald-50/40 dark:bg-emerald-500/5'
                      )}
                    >
                      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', severityColor(n.severity))} />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{n.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{n.body}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground">{relativeTime(n.createdAt)}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full p-1 hover:bg-accent" aria-label="User menu">
              <Avatar className="h-8 w-8 ring-1 ring-border">
                <AvatarFallback className="bg-emerald-500/15 text-emerald-700 text-xs font-semibold dark:text-emerald-300">
                  {user?.name?.charAt(0).toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-semibold">{user?.name}</div>
              <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setActiveView('settings')}>
              <Icons.Store className="mr-2 h-4 w-4" /> Module Marketplace
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveView('export')}>
              <Icons.Download className="mr-2 h-4 w-4" /> Export Data
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setActiveView('audit')}>
              <Icons.History className="mr-2 h-4 w-4" /> Audit Log
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                localStorage.removeItem('nexus-suite-store')
                window.location.reload()
              }}
            >
              <Icons.RefreshCw className="mr-2 h-4 w-4" /> Reset session
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
