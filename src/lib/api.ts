// Tiny fetch helper with consistent error handling.
export async function api<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let msg = `Request failed (${res.status})`
    try {
      const j = JSON.parse(text)
      msg = j.error || msg
    } catch {
      if (text) msg = text
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return (await res.json()) as T
  return (await res.text()) as unknown as T
}

export function initials(name?: string | null) {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function formatDate(d?: string | Date | null, opts: Intl.DateTimeFormatOptions = {}) {
  if (!d) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(date)
}

export function formatDateTime(d?: string | Date | null) {
  if (!d) return ''
  return formatDate(d, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function relativeTime(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - date.getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return formatDate(date)
}

export function daysUntil(d?: string | Date | null) {
  if (!d) return null
  const date = typeof d === 'string' ? new Date(d) : d
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}
