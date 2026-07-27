/**
 * Pure unit tests for CSV import/export helpers (src/lib/csv.ts).
 * No server or DB required — run with: bun run tests/csv-import.test.ts
 */

import {
  parseCsv,
  normalizeHeader,
  mapCsvHeaders,
  TASK_CSV_HEADER_MAP,
  escapeCsvCell,
  rowsToCsv,
  TASK_CSV_EXPORT_COLUMNS,
} from '../src/lib/csv'

const PASS = '\x1b[32m\u2713 PASS\x1b[0m'
const FAIL = '\x1b[31m\u2717 FAIL\x1b[0m'
let failures = 0
let passes = 0

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`${PASS}: ${name}`)
    passes++
  } else {
    console.log(`${FAIL}: ${name}${detail ? ` \u2014 ${detail}` : ''}`)
    failures++
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

console.log('\n=== Nexus Suite \u2014 CSV Import/Export Helpers ===\n')

// --- parseCsv ---
{
  const rows = parseCsv('title,status\nHello,todo\n')
  assert('basic two-column CSV', deepEqual(rows, [['title', 'status'], ['Hello', 'todo']]))
}

{
  const rows = parseCsv('title,description\n"Hello, world","He said ""hi"""\n')
  assert(
    'quoted field with comma and escaped quotes',
    deepEqual(rows, [['title', 'description'], ['Hello, world', 'He said "hi"']]),
    JSON.stringify(rows)
  )
}

{
  const rows = parseCsv('a,b\n\n1,2\n')
  assert('skips blank lines', deepEqual(rows, [['a', 'b'], ['1', '2']]), JSON.stringify(rows))
}

{
  const rows = parseCsv('onlyheader\n')
  assert('header-only yields single row', rows.length === 1 && rows[0][0] === 'onlyheader')
}

{
  const rows = parseCsv('')
  assert('empty string yields no rows', rows.length === 0)
}

{
  const rows = parseCsv('title\r\nTask A\r\nTask B')
  assert('CRLF line endings', deepEqual(rows, [['title'], ['Task A'], ['Task B']]), JSON.stringify(rows))
}

// --- normalizeHeader ---
assert('normalizeHeader strips spaces', normalizeHeader('  Due Date ') === 'duedate')
assert('normalizeHeader strips underscores', normalizeHeader('estimate_hours') === 'estimatehours')
assert('normalizeHeader strips hyphens', normalizeHeader('task-title') === 'tasktitle')

// --- mapCsvHeaders ---
{
  const mapped = mapCsvHeaders(['Title', 'Priority', 'UnknownCol', 'Due Date'])
  assert(
    'mapCsvHeaders maps aliases and nulls unknown',
    deepEqual(mapped, ['title', 'priority', null, 'dueDate']),
    JSON.stringify(mapped)
  )
}

{
  const mapped = mapCsvHeaders(['name', 'desc', 'state', 'labels'], TASK_CSV_HEADER_MAP)
  assert(
    'common aliases resolve to canonical keys',
    deepEqual(mapped, ['title', 'description', 'status', 'tags']),
    JSON.stringify(mapped)
  )
}

{
  const mapped = mapCsvHeaders(['foo', 'bar'])
  assert('no title column \u2192 no title in map', !mapped.includes('title'))
}

// --- escapeCsvCell / rowsToCsv ---
assert('escapeCsvCell plain', escapeCsvCell('hello') === 'hello')
assert('escapeCsvCell null', escapeCsvCell(null) === '')
assert('escapeCsvCell undefined', escapeCsvCell(undefined) === '')
assert('escapeCsvCell with comma', escapeCsvCell('a,b') === '"a,b"')
assert('escapeCsvCell with quote', escapeCsvCell('say "hi"') === '"say ""hi"""')
assert('escapeCsvCell with newline', escapeCsvCell('line1\nline2') === '"line1\nline2"')

{
  const csv = rowsToCsv([
    ['title', 'description'],
    ['Hello', 'world'],
    ['a,b', 'say "hi"'],
  ])
  assert(
    'rowsToCsv round-trip parseable',
    deepEqual(parseCsv(csv), [
      ['title', 'description'],
      ['Hello', 'world'],
      ['a,b', 'say "hi"'],
    ]),
    csv
  )
}

{
  const empty = rowsToCsv([])
  assert('rowsToCsv empty', empty === '')
}

assert(
  'TASK_CSV_EXPORT_COLUMNS includes title first',
  TASK_CSV_EXPORT_COLUMNS[0] === 'title' && TASK_CSV_EXPORT_COLUMNS.includes('status')
)

console.log(`\n=== Summary: ${passes} passed, ${failures} failed ===\n`)
if (failures > 0) process.exit(1)
