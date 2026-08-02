'use client'

import * as React from 'react'
import * as Icons from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api, formatDate } from '@/lib/api'
import { cn } from '@/lib/utils'

interface CustomFieldDef {
  id: string
  key: string
  label: string
  type: string
  options: { choices?: string[] } | null
  defaultValue: string | null
  required: boolean
}

interface CustomFieldValue {
  id: string
  fieldDefId: string
  valueText: string | null
  valueNumber: number | null
  valueDate: string | null
  valueBool: boolean | null
  valueJson: string | null
}

/**
 * Renders custom fields for a given entity (task, kra, risk, etc.).
 * Loads field definitions + existing values, then renders the right input
 * type per field. Calls onChange with a map of fieldDefId → value whenever
 * a value changes. The parent component is responsible for calling the
 * /api/custom-fields/values endpoint to persist.
 */
export function CustomFieldsRenderer({
  entityType,
  entityId,
  onDirty,
}: {
  entityType: string
  entityId?: string  // undefined when creating a new entity
  onDirty?: (isDirty: boolean) => void
}) {
  const [defs, setDefs] = React.useState<CustomFieldDef[]>([])
  const [values, setValues] = React.useState<Record<string, unknown>>({})
  const [loading, setLoading] = React.useState(true)

  // Load field definitions
  React.useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const d = await api<{ fields: CustomFieldDef[] }>(`/api/custom-fields?entityType=${entityType}`)
        if (!mounted) return
        setDefs(d.fields)
        // Apply defaults for new entities
        if (!entityId) {
          const defaults: Record<string, unknown> = {}
          for (const f of d.fields) {
            if (f.defaultValue) {
              defaults[f.id] = f.type === 'boolean' ? f.defaultValue === 'true' : f.defaultValue
            }
          }
          setValues(defaults)
        }
      } catch {
        // ignore — custom fields may not be configured
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [entityType, entityId])

  // Load existing values when entityId is provided
  React.useEffect(() => {
    if (!entityId) return
    let mounted = true
    ;(async () => {
      try {
        const d = await api<{ values: (CustomFieldValue & { fieldDef: { key: string; label: string; type: string } })[] }>(
          `/api/custom-fields/values?entityType=${entityType}&entityId=${entityId}`
        )
        if (!mounted) return
        const v: Record<string, unknown> = {}
        for (const val of d.values) {
          if (val.valueText !== null) v[val.fieldDefId] = val.valueText
          else if (val.valueNumber !== null) v[val.fieldDefId] = val.valueNumber
          else if (val.valueDate !== null) v[val.fieldDefId] = val.valueDate
          else if (val.valueBool !== null) v[val.fieldDefId] = val.valueBool
          else if (val.valueJson !== null) v[val.fieldDefId] = JSON.parse(val.valueJson)
        }
        setValues(v)
      } catch {
        // ignore
      }
    })()
    return () => { mounted = false }
  }, [entityType, entityId])

  const setValue = (fieldDefId: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [fieldDefId]: value }))
    onDirty?.(true)
  }

  if (loading) return null
  if (defs.length === 0) return null

  return (
    <div className="space-y-3 border-t pt-3 mt-3">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icons.Settings2 className="h-3 w-3" />
        Custom Fields
      </div>
      <div className="grid grid-cols-2 gap-3">
        {defs.map((f) => (
          <FieldInput key={f.id} def={f} value={values[f.id]} onChange={(v) => setValue(f.id, v)} />
        ))}
      </div>
    </div>
  )
}

function FieldInput({
  def, value, onChange,
}: {
  def: CustomFieldDef; value: unknown; onChange: (v: unknown) => void
}) {
  const label = (
    <Label className="text-xs">
      {def.label}
      {def.required && <span className="text-rose-500 ml-0.5">*</span>}
    </Label>
  )

  switch (def.type) {
    case 'text':
    case 'url':
    case 'email':
      return (
        <div>
          {label}
          <Input
            type={def.type === 'email' ? 'email' : def.type === 'url' ? 'url' : 'text'}
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={def.defaultValue || ''}
            className="mt-1"
          />
        </div>
      )
    case 'number':
      return (
        <div>
          {label}
          <Input
            type="number"
            value={value !== undefined && value !== null ? String(value) : ''}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            className="mt-1"
          />
        </div>
      )
    case 'textarea':
      return (
        <div className="col-span-2">
          {label}
          <Textarea
            value={(value as string) || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            className="mt-1"
          />
        </div>
      )
    case 'boolean':
      return (
        <div className="flex flex-col">
          {label}
          <div className="mt-2">
            <Switch checked={!!value} onCheckedChange={onChange} />
          </div>
        </div>
      )
    case 'date': {
      const dateValue = value ? new Date(value as string) : undefined
      return (
        <div>
          {label}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="mt-1 w-full justify-start font-normal">
                <Icons.Calendar className="mr-2 h-3.5 w-3.5" />
                {dateValue ? formatDate(dateValue) : 'Pick date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateValue}
                onSelect={(d) => onChange(d ? d.toISOString() : null)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )
    }
    case 'select': {
      const choices = def.options?.choices || []
      return (
        <div>
          {label}
          <Select value={(value as string) || ''} onValueChange={onChange}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              {choices.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )
    }
    case 'multiselect': {
      const choices = def.options?.choices || []
      const selected = Array.isArray(value) ? (value as string[]) : []
      const toggle = (c: string) => {
        if (selected.includes(c)) onChange(selected.filter((x) => x !== c))
        else onChange([...selected, c])
      }
      return (
        <div className="col-span-2">
          {label}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {choices.map((c) => {
              const on = selected.includes(c)
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggle(c)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    on ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border hover:bg-accent'
                  )}
                >
                  {c}
                </button>
              )
            })}
            {choices.length === 0 && <span className="text-xs text-muted-foreground">No choices defined</span>}
          </div>
        </div>
      )
    }
    default:
      return null
  }
}

/**
 * Helper: persist custom field values for an entity.
 * Called by parent components after the entity is created/updated.
 */
export async function saveCustomFieldValues(
  entityType: string,
  entityId: string,
  values: Record<string, unknown>,
  defs: CustomFieldDef[]
): Promise<void> {
  for (const def of defs) {
    const raw = values[def.id]
    if (raw === undefined || raw === null || raw === '') continue
    const body: Record<string, unknown> = {
      entityType, entityId, fieldDefId: def.id,
    }
    switch (def.type) {
      case 'number':
        body.valueNumber = Number(raw)
        break
      case 'boolean':
        body.valueBool = !!raw
        break
      case 'date':
        body.valueDate = raw as string
        break
      case 'multiselect':
        body.valueJson = JSON.stringify(raw)
        break
      default:
        body.valueText = String(raw)
    }
    try {
      await api('/api/custom-fields/values', { method: 'POST', body: JSON.stringify(body) })
    } catch {
      // best-effort — don't fail the whole save
    }
  }
}

// Suppress unused import warning
void Badge
