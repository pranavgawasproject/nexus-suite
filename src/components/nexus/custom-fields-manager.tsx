'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CustomField {
  id: string
  moduleKey: string
  entityType: string
  key: string
  label: string
  type: string
  options: { choices?: string[] } | null
  defaultValue: string | null
  required: boolean
  searchable: boolean
  position: number
  active: boolean
}

const ENTITY_TYPES = [
  { value: 'task', label: 'Tasks', moduleKey: 'tasks' },
  { value: 'kra', label: 'KRA/KPA', moduleKey: 'kra' },
  { value: 'risk', label: 'Risks', moduleKey: 'risk' },
  { value: 'issue', label: 'Issues', moduleKey: 'risk' },
  { value: 'expense', label: 'Expenses', moduleKey: 'budget' },
  { value: 'leave', label: 'Leave Requests', moduleKey: 'leave' },
]

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: 'Type' },
  { value: 'number', label: 'Number', icon: 'Hash' },
  { value: 'date', label: 'Date', icon: 'Calendar' },
  { value: 'select', label: 'Select (single)', icon: 'ChevronDown' },
  { value: 'multiselect', label: 'Multi-select', icon: 'List' },
  { value: 'boolean', label: 'Checkbox', icon: 'CheckSquare' },
  { value: 'url', label: 'URL', icon: 'Link' },
  { value: 'email', label: 'Email', icon: 'Mail' },
]

export function CustomFieldsManager() {
  const [fields, setFields] = React.useState<CustomField[]>([])
  const [entityType, setEntityType] = React.useState('task')
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<CustomField | null>(null)

  const load = React.useCallback(async () => {
    try {
      const d = await api<{ fields: CustomField[] }>(`/api/custom-fields?entityType=${entityType}`)
      setFields(d.fields)
    } catch {
      // ignore
    }
  }, [entityType])

  React.useEffect(() => { load() }, [load])

  const deactivate = async (id: string) => {
    if (!confirm('Deactivate this custom field? Existing values are preserved.')) return
    try {
      await api(`/api/custom-fields?id=${id}`, { method: 'DELETE' })
      toast.success('Field deactivated')
      load()
    } catch { toast.error('Failed') }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Custom Fields</h1>
        <p className="text-sm text-muted-foreground">
          Extend modules with custom fields — no forking required (ERPNext DocTypes pattern).
          Fields appear on create/edit forms for the selected entity type.
        </p>
      </div>

      <Tabs value={entityType} onValueChange={setEntityType}>
        <TabsList className="flex-wrap">
          {ENTITY_TYPES.map((e) => (
            <TabsTrigger key={e.value} value={e.value}>{e.label}</TabsTrigger>
          ))}
        </TabsList>

        {ENTITY_TYPES.map((e) => (
          <TabsContent key={e.value} value={e.value} className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Custom fields for {e.label}</CardTitle>
                  <CardDescription>{fields.length} field{fields.length === 1 ? '' : 's'} defined</CardDescription>
                </div>
                <CreateFieldDialog
                  entityType={e.value}
                  moduleKey={e.moduleKey}
                  open={createOpen}
                  onOpenChange={setCreateOpen}
                  onCreated={load}
                />
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {fields.map((f) => (
                    <div key={f.id} className="flex items-start gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                        {(() => {
                          const ft = FIELD_TYPES.find((t) => t.value === f.type)
                          const I = ft ? (Icons as never)[ft.icon] as Icons.LucideIcon : Icons.Type
                          return I ? <I className="h-4 w-4" /> : null
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{f.label}</span>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{f.key}</code>
                          <Badge variant="outline" className="text-[10px] capitalize">{f.type}</Badge>
                          {f.required && <Badge className="text-[10px] bg-rose-500">required</Badge>}
                          {f.searchable && <Badge variant="secondary" className="text-[10px]">searchable</Badge>}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {f.options?.choices && `Choices: ${f.options.choices.join(', ')}`}
                          {f.defaultValue && ` · Default: ${f.defaultValue}`}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>
                        <Icons.Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => deactivate(f.id)}>
                        <Icons.Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  {fields.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No custom fields yet. Click "New field" to extend {e.label}.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <EditFieldDialog field={editing} onClose={() => setEditing(null)} onSaved={load} />

      <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10 dark:border-emerald-900/50">
        <CardContent className="flex items-start gap-3 p-4">
          <Icons.Sparkles className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" />
          <div>
            <div className="text-sm font-semibold">How custom fields work</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Define a field once per entity type (e.g. <code>client_priority</code> on Tasks).
              It automatically appears on the task create/edit dialog with the right input type
              (text, select, date, etc.). Values are stored separately so they don&apos;t bloat the
              main table. Disable a field anytime — existing values are preserved.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CreateFieldDialog({
  entityType, moduleKey, open, onOpenChange, onCreated,
}: {
  entityType: string; moduleKey: string; open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void
}) {
  const [key, setKey] = React.useState('')
  const [label, setLabel] = React.useState('')
  const [type, setType] = React.useState('text')
  const [required, setRequired] = React.useState(false)
  const [searchable, setSearchable] = React.useState(false)
  const [defaultValue, setDefaultValue] = React.useState('')
  const [choices, setChoices] = React.useState('')  // comma-separated for select/multiselect

  const submit = async () => {
    if (!key.trim() || !label.trim()) { toast.error('Key and label required'); return }
    if (!/^[a-z0-9_]+$/.test(key)) { toast.error('Key must be lowercase snake_case'); return }
    const options = (type === 'select' || type === 'multiselect') && choices.trim()
      ? JSON.stringify({ choices: choices.split(',').map((c) => c.trim()).filter(Boolean) })
      : null
    try {
      await api('/api/custom-fields', {
        method: 'POST',
        body: JSON.stringify({
          moduleKey, entityType, key: key.trim(), label: label.trim(),
          type, required, searchable, defaultValue: defaultValue || null, options,
        }),
      })
      toast.success(`Field "${label}" created`)
      setKey(''); setLabel(''); setType('text'); setRequired(false); setSearchable(false); setDefaultValue(''); setChoices('')
      onOpenChange(false); onCreated()
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Failed') }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm"><Icons.Plus className="h-4 w-4" /><span className="ml-1.5">New field</span></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>New custom field</DialogTitle>
          <DialogDescription>Appears on {entityType} create/edit forms.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cf-key">Key *</Label>
              <Input id="cf-key" value={key} onChange={(e) => setKey(e.target.value)} placeholder="client_priority" className="mt-1 font-mono text-sm" />
              <div className="mt-1 text-[10px] text-muted-foreground">lowercase snake_case</div>
            </div>
            <div>
              <Label htmlFor="cf-label">Label *</Label>
              <Input id="cf-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Client Priority" className="mt-1" autoFocus />
            </div>
          </div>
          <div>
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(type === 'select' || type === 'multiselect') && (
            <div>
              <Label htmlFor="cf-choices">Choices (comma-separated)</Label>
              <Input id="cf-choices" value={choices} onChange={(e) => setChoices(e.target.value)} placeholder="Low, Medium, High" className="mt-1" />
            </div>
          )}
          <div>
            <Label htmlFor="cf-default">Default value</Label>
            <Input id="cf-default" value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} className="mt-1" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={required} onCheckedChange={setRequired} /> Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={searchable} onCheckedChange={setSearchable} /> Searchable
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Create field</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditFieldDialog({ field, onClose, onSaved }: { field: CustomField | null; onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = React.useState('')
  const [required, setRequired] = React.useState(false)
  const [searchable, setSearchable] = React.useState(false)
  const [defaultValue, setDefaultValue] = React.useState('')
  const [choices, setChoices] = React.useState('')

  React.useEffect(() => {
    if (field) {
      setLabel(field.label)
      setRequired(field.required)
      setSearchable(field.searchable)
      setDefaultValue(field.defaultValue || '')
      setChoices(field.options?.choices?.join(', ') || '')
    }
  }, [field])

  if (!field) return null

  const save = async () => {
    const options = (field.type === 'select' || field.type === 'multiselect') && choices.trim()
      ? JSON.stringify({ choices: choices.split(',').map((c) => c.trim()).filter(Boolean) })
      : null
    try {
      await api('/api/custom-fields', {
        method: 'PATCH',
        body: JSON.stringify({
          id: field.id, label, required, searchable,
          defaultValue: defaultValue || null, options,
        }),
      })
      toast.success('Field updated')
      onClose(); onSaved()
    } catch { toast.error('Failed') }
  }

  return (
    <Dialog open={!!field} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit field: <code className="text-sm">{field.key}</code></DialogTitle>
          <DialogDescription>Field type cannot be changed after creation.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="ef-label">Label</Label>
            <Input id="ef-label" value={label} onChange={(e) => setLabel(e.target.value)} className="mt-1" autoFocus />
          </div>
          {(field.type === 'select' || field.type === 'multiselect') && (
            <div>
              <Label htmlFor="ef-choices">Choices (comma-separated)</Label>
              <Input id="ef-choices" value={choices} onChange={(e) => setChoices(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <Label htmlFor="ef-default">Default value</Label>
            <Input id="ef-default" value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} className="mt-1" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={required} onCheckedChange={setRequired} /> Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={searchable} onCheckedChange={setSearchable} /> Searchable
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
