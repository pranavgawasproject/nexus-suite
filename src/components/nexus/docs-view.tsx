'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { useAppStore } from '@/lib/store'
import { api, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Doc {
  id: string
  title: string
  slug: string
  content?: string
  parentId?: string | null
  version: number
  isPublic: boolean
  childCount?: number
  createdAt: string
  updatedAt: string
}

export function DocsView() {
  const { isModuleOn, setActiveView } = useAppStore()
  const [docs, setDocs] = React.useState<Doc[]>([])
  const [selected, setSelected] = React.useState<Doc | null>(null)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [content, setContent] = React.useState('')
  const [title, setTitle] = React.useState('')
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const d = await api<{ documents: Doc[] }>('/api/documents?parentId=root')
      setDocs(d.documents)
    } catch {}
  }, [])
  React.useEffect(() => { if (isModuleOn('collab')) load() }, [load, isModuleOn])

  if (!isModuleOn('collab')) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Icons.Lock className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Docs &amp; Collaboration is disabled</h3>
          <p className="mt-1 text-sm text-muted-foreground">Enable this module in the Marketplace.</p>
          <Button className="mt-4" onClick={() => setActiveView('settings')}><Icons.Store className="mr-2 h-4 w-4" /> Open Marketplace</Button>
        </CardContent>
      </Card>
    )
  }

  const open = async (doc: Doc) => {
    // Fetch full content
    const all = await api<{ documents: Doc[] }>('/api/documents?parentId=root')
    const full = all.documents.find((d) => d.id === doc.id) || doc
    setSelected(full)
    setContent(full.content || '')
    setTitle(full.title)
  }

  const save = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await api('/api/documents', { method: 'PATCH', body: JSON.stringify({
        id: selected.id, title, content, changeSummary: 'Edit via UI'
      }) })
      toast.success(`Saved — version ${selected.version + 1}`)
      setSelected({ ...selected, title, content, version: selected.version + 1 })
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally { setSaving(false) }
  }

  const create = async () => {
    if (!title.trim()) { toast.error('Title required'); return }
    try {
      const { document } = await api<{ document: Doc }>('/api/documents', {
        method: 'POST', body: JSON.stringify({ title: title.trim(), content: '' })
      })
      toast.success('Doc created')
      setCreateOpen(false); setTitle('')
      load(); open(document)
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Docs &amp; Wiki</h1>
          <p className="text-sm text-muted-foreground">{docs.length} document{docs.length === 1 ? '' : 's'} · Markdown with versioning</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5">New doc</span></Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>New document</DialogTitle>
              <DialogDescription>Create a new wiki page or doc.</DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="dt">Title *</Label>
              <Input id="dt" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus placeholder="e.g. Engineering Handbook" />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={create}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Doc list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
            <CardDescription>Click to open</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-[600px] overflow-y-auto scrollbar-thin">
              {docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => open(d)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/40',
                    selected?.id === d.id && 'bg-emerald-50/40 dark:bg-emerald-950/10'
                  )}
                >
                  <Icons.FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium">{d.title}</div>
                    <div className="text-xs text-muted-foreground">
                      v{d.version} · {formatDate(d.updatedAt, { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                  {d.isPublic && <Badge variant="secondary" className="text-[9px]">Public</Badge>}
                </button>
              ))}
              {docs.length === 0 && (
                <div className="py-12 text-center text-sm text-muted-foreground">No documents yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          {selected ? (
            <>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-base font-semibold border-0 px-0 h-auto focus-visible:ring-0"
                  />
                  <Badge variant="outline">v{selected.version}</Badge>
                </div>
                <CardDescription>Updated {formatDate(selected.updatedAt)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm scrollbar-thin"
                  placeholder="Write in Markdown..."
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{content.length} chars · Markdown</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setContent(selected.content || '')}>Discard</Button>
                    <Button size="sm" onClick={save} disabled={saving}>
                      {saving && <Icons.Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                      Save (new version)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-12 text-center">
              <Icons.FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Pick a document</h3>
              <p className="mt-1 text-sm text-muted-foreground">Or create a new one to start writing.</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}
