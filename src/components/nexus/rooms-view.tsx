'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarUi } from '@/components/ui/calendar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, initials, formatDateTime, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Room {
  id: string
  name: string
  location?: string | null
  capacity: number
  amenities?: string | null
  active: boolean
  _count?: { bookings: number }
}
interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string | null
}
interface Booking {
  id: string
  title: string
  description?: string | null
  startTime: string
  endTime: string
  recurring?: string | null
  status: string
  attendees: number
  room: { id: string; name: string; location?: string | null; capacity: number; amenities?: string | null }
  bookedBy: User
}

const AMENITY_LIST = ['projector', 'video', 'whiteboard', 'tv', 'audio', 'conference-phone']

export function RoomsView() {
  const { isModuleOn, user } = useAppStore()
  const [rooms, setRooms] = React.useState<Room[]>([])
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [addRoomOpen, setAddRoomOpen] = React.useState(false)
  const [filterRoom, setFilterRoom] = React.useState<string>('all')
  const [viewDate, setViewDate] = React.useState<Date>(new Date())

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [r, b] = await Promise.all([
        api<{ rooms: Room[] }>('/api/rooms'),
        api<{ bookings: Booking[] }>('/api/bookings'),
      ])
      setRooms(r.rooms)
      setBookings(b.bookings)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (isModuleOn('rooms')) load()
  }, [load, isModuleOn])

  // Week view calculations (declared before any early return so hook order is stable)
  const startOfWeek = React.useMemo(() => {
    const d = new Date(viewDate)
    const day = d.getDay() // 0=Sun
    d.setDate(d.getDate() - day)
    d.setHours(0, 0, 0, 0)
    return d
  }, [viewDate])
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(d.getDate() + i)
    return d
  })

  if (!isModuleOn('rooms')) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icons.Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Room Booking is disabled</h3>
          <p className="mt-1 text-sm text-muted-foreground">Enable this module in the Marketplace.</p>
          <Button className="mt-4" onClick={() => useAppStore.getState().setActiveView('settings')}>
            <Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace
          </Button>
        </CardContent>
      </Card>
    )
  }

  const visibleBookings = filterRoom === 'all' ? bookings : bookings.filter((b) => b.room.id === filterRoom)

  const bookingsForDay = (day: Date) => {
    return visibleBookings
      .filter((b) => {
        const bd = new Date(b.startTime)
        return bd.getDate() === day.getDate() && bd.getMonth() === day.getMonth() && bd.getFullYear() === day.getFullYear()
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }

  const cancelBooking = async (id: string) => {
    try {
      await api(`/api/bookings?id=${id}`, { method: 'DELETE' })
      toast.success('Booking cancelled')
      load()
    } catch {
      toast.error('Failed to cancel')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meeting Rooms</h1>
          <p className="text-sm text-muted-foreground">
            {rooms.length} room{rooms.length === 1 ? '' : 's'} · {bookings.filter((b) => b.status === 'confirmed').length} active booking{bookings.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filterRoom} onValueChange={setFilterRoom}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All rooms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rooms</SelectItem>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setAddRoomOpen(true)}>
            <Icons.Plus className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Room</span>
          </Button>
          <BookingDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            rooms={rooms}
            onCreated={() => load()}
          />
        </div>
      </div>

      {/* Room cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rooms.map((r) => {
          const todayBookings = bookings.filter((b) => {
            const bd = new Date(b.startTime)
            const now = new Date()
            return b.room.id === r.id && bd.toDateString() === now.toDateString()
          })
          return (
            <Card key={r.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                      <Icons.DoorOpen className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.location || '—'}</div>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    <Icons.Users className="mr-1 h-3 w-3" /> {r.capacity}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {r.amenities?.split(',').map((a) => (
                    <Badge key={a} variant="outline" className="text-[9px] capitalize">{a.trim()}</Badge>
                  ))}
                  {!r.amenities && (
                    <span className="text-xs text-muted-foreground">No amenities listed</span>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {todayBookings.length} booking{todayBookings.length === 1 ? '' : 's'} today
                  </span>
                  <button
                    onClick={() => {
                      setFilterRoom(r.id)
                      setCreateOpen(true)
                    }}
                    className="text-emerald-600 hover:underline"
                  >
                    Book →
                  </button>
                </div>
              </CardContent>
            </Card>
          )
        })}
        {rooms.length === 0 && !loading && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No rooms yet. Add one to start booking.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Week calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Week view</CardTitle>
              <CardDescription>
                {formatDate(weekDays[0])} — {formatDate(weekDays[6])}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => {
                const d = new Date(viewDate)
                d.setDate(d.getDate() - 7)
                setViewDate(d)
              }}>
                <Icons.ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setViewDate(new Date())}>
                Today
              </Button>
              <Button variant="ghost" size="icon" onClick={() => {
                const d = new Date(viewDate)
                d.setDate(d.getDate() + 7)
                setViewDate(d)
              }}>
                <Icons.ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-7 border-t">
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === new Date().toDateString()
              const dayBookings = bookingsForDay(day)
              return (
                <div
                  key={i}
                  className={cn(
                    'min-h-[180px] border-r last:border-r-0 p-2',
                    isToday && 'bg-emerald-50/40 dark:bg-emerald-950/10'
                  )}
                >
                  <div className="mb-2 flex flex-col items-center">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {day.toLocaleDateString('en-IN', { weekday: 'short' })}
                    </span>
                    <span
                      className={cn(
                        'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                        isToday ? 'bg-emerald-600 text-white' : 'text-foreground'
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {dayBookings.map((b) => (
                      <Popover key={b.id}>
                        <PopoverTrigger asChild>
                          <button
                            className={cn(
                              'w-full rounded-md border-l-2 bg-card p-1.5 text-left shadow-sm hover:shadow-md transition-shadow',
                              b.status === 'cancelled' && 'opacity-50 line-through',
                              b.recurring === 'weekly' ? 'border-l-amber-500' : b.recurring === 'daily' ? 'border-l-rose-500' : 'border-l-emerald-500'
                            )}
                          >
                            <div className="text-[10px] font-medium text-muted-foreground">
                              {new Date(b.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                            <div className="truncate text-xs font-medium">{b.title}</div>
                            <div className="truncate text-[10px] text-muted-foreground">{b.room.name}</div>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="start">
                          <div className="space-y-2">
                            <div className="font-semibold text-sm">{b.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}
                            </div>
                            <div className="text-xs">
                              <Icons.DoorOpen className="mr-1 inline h-3 w-3" />
                              {b.room.name} ({b.room.location || '—'})
                            </div>
                            <div className="text-xs">
                              <Icons.Users className="mr-1 inline h-3 w-3" />
                              {b.attendees} attendee{b.attendees === 1 ? '' : 's'} · capacity {b.room.capacity}
                            </div>
                            {b.recurring && b.recurring !== 'none' && (
                              <Badge variant="secondary" className="text-[10px] capitalize">
                                <Icons.Repeat className="mr-1 h-3 w-3" /> {b.recurring}
                              </Badge>
                            )}
                            <div className="flex items-center gap-2 border-t pt-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[9px]">{initials(b.bookedBy.name)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">{b.bookedBy.name}</span>
                            </div>
                            {b.status !== 'cancelled' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                className="w-full"
                                onClick={() => cancelBooking(b.id)}
                              >
                                Cancel booking
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ))}
                    {dayBookings.length === 0 && (
                      <div className="rounded-md border border-dashed p-2 text-center text-[10px] text-muted-foreground">
                        —
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming bookings list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming bookings</CardTitle>
          <CardDescription>Next 10 bookings across all rooms</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {bookings
              .filter((b) => new Date(b.startTime) >= new Date() && b.status !== 'cancelled')
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .slice(0, 10)
              .map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <span className="text-[9px] font-semibold uppercase">
                      {new Date(b.startTime).toLocaleDateString('en-IN', { month: 'short' })}
                    </span>
                    <span className="text-sm font-bold leading-none">
                      {new Date(b.startTime).getDate()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{b.title}</span>
                      {b.recurring && b.recurring !== 'none' && (
                        <Icons.Repeat className="h-3 w-3 text-amber-500" />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDateTime(b.startTime)} → {formatDateTime(b.endTime)}</span>
                      <span className="flex items-center gap-1">
                        <Icons.DoorOpen className="h-3 w-3" /> {b.room.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Icons.Users className="h-3 w-3" /> {b.attendees}
                      </span>
                    </div>
                  </div>
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-[10px]">{initials(b.bookedBy.name)}</AvatarFallback>
                  </Avatar>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelBooking(b.id)}
                    className="text-rose-600 hover:text-rose-700"
                  >
                    <Icons.X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            {bookings.filter((b) => new Date(b.startTime) >= new Date() && b.status !== 'cancelled').length === 0 && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No upcoming bookings. Click &ldquo;Book room&rdquo; to create one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AddRoomDialog open={addRoomOpen} onOpenChange={setAddRoomOpen} onCreated={() => load()} />
    </div>
  )
}

function BookingDialog({
  open,
  onOpenChange,
  rooms,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  rooms: Room[]
  onCreated: () => void
}) {
  const [roomId, setRoomId] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [date, setDate] = React.useState<Date | undefined>(new Date())
  const [startTime, setStartTime] = React.useState('10:00')
  const [endTime, setEndTime] = React.useState('11:00')
  const [attendees, setAttendees] = React.useState('4')
  const [recurring, setRecurring] = React.useState('none')
  const [submitting, setSubmitting] = React.useState(false)

  const submit = async () => {
    if (!roomId || !title.trim() || !date) {
      toast.error('Room, title, and date are required')
      return
    }
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const start = new Date(date)
    start.setHours(sh, sm, 0, 0)
    const end = new Date(date)
    end.setHours(eh, em, 0, 0)

    if (end <= start) {
      toast.error('End time must be after start time')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          title: title.trim(),
          description: description.trim() || null,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          attendees: Number(attendees) || 1,
          recurring,
        }),
      })
      if (res.status === 409) {
        const data = await res.json()
        toast.error(`Conflict: ${data.error}`, {
          description: data.conflict
            ? `Existing: ${data.conflict.title} (${formatDateTime(data.conflict.startTime)})`
            : undefined,
        })
        return
      }
      if (!res.ok) throw new Error('Failed')
      toast.success('Booking confirmed')
      setTitle('')
      setDescription('')
      setAttendees('4')
      setRecurring('none')
      onOpenChange(false)
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Icons.Plus className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">Book room</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Book a room</DialogTitle>
          <DialogDescription>
            Pick a room, time slot, and optional recurrence. We&apos;ll prevent double-bookings automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Room *</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="flex items-center gap-2">
                      <Icons.DoorOpen className="h-3.5 w-3.5" />
                      {r.name} · cap {r.capacity}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="b-title">Title *</Label>
            <Input
              id="b-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly leadership sync"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="b-desc">Description</Label>
            <Textarea
              id="b-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Agenda, attendees, dial-in link…"
            />
          </div>
          <div>
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="mt-1 w-full justify-start font-normal">
                  <Icons.Calendar className="mr-2 h-4 w-4" />
                  {date ? formatDate(date) : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarUi mode="single" selected={date} onSelect={setDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="b-start">Start</Label>
              <Input
                id="b-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="b-end">End</Label>
              <Input
                id="b-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="b-att">Attendees</Label>
              <Input
                id="b-att"
                type="number"
                min="1"
                value={attendees}
                onChange={(e) => setAttendees(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Repeat</Label>
              <Select value={recurring} onValueChange={setRecurring}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="daily">Daily (next 8)</SelectItem>
                  <SelectItem value="weekly">Weekly (next 8)</SelectItem>
                  <SelectItem value="monthly">Monthly (next 8)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Icons.Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddRoomDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onCreated: () => void
}) {
  const [name, setName] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [capacity, setCapacity] = React.useState('8')
  const [amenities, setAmenities] = React.useState<string[]>([])

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Room name is required')
      return
    }
    try {
      await api('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          location: location.trim() || null,
          capacity: Number(capacity) || 4,
          amenities: amenities.join(','),
        }),
      })
      toast.success('Room added')
      setName('')
      setLocation('')
      setCapacity('8')
      setAmenities([])
      onOpenChange(false)
      onCreated()
    } catch {
      toast.error('Failed to add room')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Add a room</DialogTitle>
          <DialogDescription>Register a new bookable meeting space.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="r-name">Name *</Label>
            <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jupiter" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="r-loc">Location</Label>
              <Input id="r-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Floor 2" />
            </div>
            <div>
              <Label htmlFor="r-cap">Capacity</Label>
              <Input id="r-cap" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Amenities</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AMENITY_LIST.map((a) => {
                const on = amenities.includes(a)
                return (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmenities((prev) => on ? prev.filter((x) => x !== a) : [...prev, a])}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs capitalize transition-colors',
                      on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border hover:bg-accent'
                    )}
                  >
                    {a}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Add room</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
