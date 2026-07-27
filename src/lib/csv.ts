/**
 * Shared CSV helpers for data import/export (PRD §5 Data Portability).
 * Pure functions — safe to unit-test without a server or DB.
 */

/** Parse a CSV string into rows of cells. Handles quoted fields and escaped quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let current: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      current.push(field.trim())
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      current.push(field.trim())
      field = ''
      if (current.some((cell) => cell.length > 0)) rows.push(current)
      current = []
    } else {
      field += c
    }
  }
  current.push(field.trim())
  if (current.some((cell) => cell.length > 0)) rows.push(current)
  return rows
}

/** Escape a single CSV cell (quotes fields that contain comma, quote, or newline). */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Serialize rows (including header) to a CSV string.
 * Uses RFC 4180-style quoting via escapeCsvCell.
 */
export function rowsToCsv(rows: Array<Array<unknown>>): string {
  if (!rows.length) return ''
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n')
}

/** Normalize a header cell for lookup (lowercase, strip spaces/underscores/hyphens). */
export function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '')
}

/** Default header aliases for the Tasks module CSV import. */
export const TASK_CSV_HEADER_MAP: Record<string, string> = {
  title: 'title',
  name: 'title',
  task: 'title',
  tasktitle: 'title',
  description: 'description',
  desc: 'description',
  status: 'status',
  state: 'status',
  priority: 'priority',
  type: 'type',
  duedate: 'dueDate',
  due: 'dueDate',
  deadline: 'dueDate',
  estimatehours: 'estimateHours',
  estimate: 'estimateHours',
  hours: 'estimateHours',
  tags: 'tags',
  label: 'tags',
  labels: 'tags',
}

/** Canonical export column order for Tasks CSV (matches import-friendly headers). */
export const TASK_CSV_EXPORT_COLUMNS = [
  'title',
  'description',
  'status',
  'priority',
  'type',
  'dueDate',
  'estimateHours',
  'tags',
] as const

/**
 * Map a header row to canonical field keys using an alias map.
 * Returns an array parallel to headers (null for unknown columns).
 */
export function mapCsvHeaders(
  headers: string[],
  aliasMap: Record<string, string> = TASK_CSV_HEADER_MAP
): (string | null)[] {
  return headers.map((h) => aliasMap[normalizeHeader(h)] || null)
}
