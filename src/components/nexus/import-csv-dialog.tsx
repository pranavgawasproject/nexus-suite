'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
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
import { toast } from 'sonner'
import { api } from '@/lib/api'

interface Project {
  id: string
  name: string
  color: string
}

export function ImportCsvDialog({
  open,
  onOpenChange,
  projects,
  defaultProject,
  onImported,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  projects: Project[]
  defaultProject?: string
  onImported: () => void
}) {
  const [projectId, setProjectId] = React.useState(defaultProject || '')
  const [csvText, setCsvText] = React.useState('')
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<{
    created: number
    skipped: number
    errors: Array<{ row: number; message: string }>
  } | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open && defaultProject) setProjectId(defaultProject)
    if (!open) {
      setCsvText('')
      setFileName(null)
      setResult(null)
    }
  }, [open, defaultProject])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 2_000_000) {
      toast.error('File too large (max 2 MB)')
      return
    }
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(String(reader.result || ''))
      setResult(null)
    }
    reader.readAsText(f)
  }

  const submit = async () => {
    if (!projectId) {
      toast.error('Select a project')
      return
    }
    if (!csvText.trim()) {
      toast.error('Provide CSV content or choose a file')
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      const res = await api<{ created: number; skipped: number; errors: Array<{ row: number; message: string }> }>(
        '/api/import/tasks',
        {
          method: 'POST',
          body: JSON.stringify({ projectId, csv: csvText }),
        }
      )
      setResult({ created: res.created, skipped: res.skipped, errors: res.errors || [] })
      if (res.created > 0) {
        toast.success(`Imported ${res.created} task${res.created === 1 ? '' : 's'}`)
        onImported()
      } else if (res.skipped > 0) {
        toast.message(`No tasks created (${res.skipped} skipped)`)
      } else {
        toast.message('No rows imported')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icons.Upload className="h-4 w-4" />
          <span className="ml-1.5 hidden sm:inline">Import CSV</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Import tasks from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV or paste rows. Required column: <code className="text-xs">title</code> (aliases:
            name, task). Optional: description, status, priority, type, dueDate, estimateHours, tags.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Target project *</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>CSV file</Label>
            <div className="mt-1 flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                className="hidden"
                onChange={onFile}
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
                <Icons.FileUp className="h-4 w-4 mr-1.5" />
                Choose file
              </Button>
              {fileName && <span className="text-xs text-muted-foreground truncate max-w-[220px]">{fileName}</span>}
            </div>
          </div>
          <div>
            <Label htmlFor="csv-paste">Or paste CSV</Label>
            <Textarea
              id="csv-paste"
              value={csvText}
              onChange={(e) => {
                setCsvText(e.target.value)
                setResult(null)
              }}
              rows={8}
              placeholder={'title,description,priority,status\nShip release notes,Write changelog,high,todo'}
              className="font-mono text-xs"
            />
          </div>
          {result && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
              <p>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">{result.created} created</span>
                {result.skipped > 0 && (
                  <span className="text-muted-foreground"> · {result.skipped} skipped</span>
                )}
              </p>
              {result.errors.length > 0 && (
                <ul className="text-xs text-muted-foreground max-h-24 overflow-y-auto space-y-0.5">
                  {result.errors.slice(0, 15).map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                  {result.errors.length > 15 && <li>…and {result.errors.length - 15} more</li>}
                </ul>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Close
          </Button>
          <Button onClick={submit} disabled={submitting || !projectId || !csvText.trim()}>
            {submitting ? (
              <>
                <Icons.Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Importing…
              </>
            ) : (
              <>
                <Icons.Upload className="h-4 w-4 mr-1.5" />
                Import
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
