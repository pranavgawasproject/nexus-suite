/**
 * Module gate tests — verify disabled-module endpoints return 403 (PRD §4.5).
 *
 * These tests hit the API directly. Run while dev server is up:
 *   bun run tests/module-gate.test.ts
 */

const BASE = 'http://127.0.0.1:3000'

const PASS = '\x1b[32m✓ PASS\x1b[0m'
const FAIL = '\x1b[31m✗ FAIL\x1b[0m'
let failures = 0
let passes = 0

async function expectStatus(method: string, path: string, expected: number, body?: unknown) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const ok = res.status === expected
    if (ok) {
      console.log(`${PASS}: ${method} ${path} → ${res.status}`)
      passes++
    } else {
      console.log(`${FAIL}: ${method} ${path} → ${res.status} (expected ${expected})`)
      const txt = await res.text().catch(() => '')
      console.log(`         body: ${txt.slice(0, 200)}`)
      failures++
    }
    return res
  } catch (err) {
    console.log(`${FAIL}: ${method} ${path} → fetch error: ${err instanceof Error ? err.message : 'unknown'}`)
    failures++
  }
}

async function main() {
  console.log('\n=== Nexus Suite — Module Gate Tests (PRD §4.5) ===\n')

  // Skip gracefully if no dev server is running (e.g., in CI without a server step)
  const probe = await fetch(`${BASE}/api/session`).catch(() => null)
  if (!probe) {
    console.log('⏭  SKIP: No dev server running on localhost:3000.')
    console.log('   To run these tests: start the dev server with `bun run dev`, then `bun run test:gate`.')
    console.log('   This is expected in CI environments without a server step.')
    return
  }

  // First, ensure demo data is seeded
  await fetch(`${BASE}/api/session`).catch(() => {})

  // Disable the "leave" module for the demo org, then try to hit leave endpoints
  console.log('--- Setup: disable leave module ---')
  await fetch(`${BASE}/api/modules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moduleKey: 'leave', state: 'disabled' }),
  })

  // Expect 403 from leave endpoints
  console.log('\n--- Leave module disabled → expect 403 ---')
  await expectStatus('GET', '/api/leaves', 403)
  await expectStatus('GET', '/api/attendance', 403)
  await expectStatus('GET', '/api/holidays', 403)

  // Re-enable leave
  console.log('\n--- Setup: re-enable leave module ---')
  await fetch(`${BASE}/api/modules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ moduleKey: 'leave', state: 'active' }),
  })

  // Now leave endpoints should return 200
  console.log('\n--- Leave module enabled → expect 200 ---')
  await expectStatus('GET', '/api/leaves', 200)
  await expectStatus('GET', '/api/attendance', 200)

  // Validation tests — invalid input should return 400
  console.log('\n--- Input validation → expect 400 ---')
  // Missing required projectId
  await expectStatus('POST', '/api/tasks', 400, { title: 'test' })
  // Empty title
  await expectStatus('POST', '/api/tasks', 400, { title: '', projectId: 'x' })
  // Invalid color format
  await expectStatus('POST', '/api/projects', 400, { name: 'Test', color: 'red' })
  // End before start (booking)
  await expectStatus('POST', '/api/bookings', 400, {
    roomId: 'x', title: 'x', startTime: '2026-07-20T10:00:00Z', endTime: '2026-07-20T09:00:00Z',
  })

  console.log('\n=== Summary ===')
  console.log(`${passes} passed, ${failures} failed\n`)
  if (failures > 0) process.exit(1)
}

main().catch((err) => {
  console.error('Test runner crashed:', err)
  process.exit(1)
})
