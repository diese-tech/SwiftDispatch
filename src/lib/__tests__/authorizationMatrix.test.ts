/**
 * Drift-proof check between code and docs (issue #63): statically parses
 * every `requireApiRole([...])` call site under `src/app/api/**` and cross-
 * checks its allowed-roles list against a hand-maintained mirror of
 * `docs/AUTHORIZATION.md`'s permission matrix. Whoever changes a route's
 * role list without updating both this table and the doc (or vice versa)
 * breaks this test instead of drifting silently.
 *
 * This does not execute any route -- it reads source text and regex-matches
 * `export async function METHOD(` blocks and the `requireApiRole([...])`
 * call within each block's body. It intentionally does not attempt to
 * assert per-route *behavior* (that's what each route's own route.test.ts
 * does) -- only that the declared allowed-roles list matches what's
 * documented.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const API_ROOT = path.resolve(__dirname, '../../app/api')
const HTTP_METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const

type MatrixEntry = { key: string; roles: string[] }

function collectRouteFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(full))
    } else if (entry.isFile() && entry.name === 'route.ts') {
      files.push(full)
    }
  }
  return files
}

function toApiPath(filePath: string): string {
  const relative = path.relative(API_ROOT, filePath).replace(/\\/g, '/')
  return `/api/${relative.replace(/\/route\.ts$/, '')}`
}

function extractMatrixEntries(filePath: string): MatrixEntry[] {
  const source = fs.readFileSync(filePath, 'utf8')
  const apiPath = toApiPath(filePath)
  const functionRegex = new RegExp(`export async function (${HTTP_METHODS.join('|')})\\s*\\(`, 'g')

  const starts: { method: string; index: number }[] = []
  let match: RegExpExecArray | null
  while ((match = functionRegex.exec(source))) {
    starts.push({ method: match[1], index: match.index })
  }

  return starts.flatMap(({ method, index }, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].index : source.length
    const body = source.slice(index, end)
    const roleMatch = body.match(/requireApiRole\(\s*\[\s*([^\]]*)\]\s*\)/)
    if (!roleMatch) return []
    const roles = roleMatch[1]
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
    return [{ key: `${method} ${apiPath}`, roles }]
  })
}

/**
 * Hand-maintained mirror of docs/AUTHORIZATION.md's permission matrix.
 * Update both this table and the doc together when a route's authorization
 * changes -- this test enforces that they never silently diverge.
 */
const EXPECTED_MATRIX: Record<string, string[]> = {
  'GET /api/admin/users': ['admin'],
  'POST /api/admin/users': ['admin'],
  'GET /api/admin/templates': ['admin', 'dispatcher'],
  'POST /api/admin/templates': ['admin'],
  'PATCH /api/admin/templates/[id]': ['admin'],
  'DELETE /api/admin/templates/[id]': ['admin'],
  'GET /api/admin/settings': ['admin'],
  'PATCH /api/admin/settings': ['admin'],
  'GET /api/admin/technicians': ['admin'],
  'POST /api/admin/technicians': ['admin'],
  'POST /api/admin/technicians/[id]/regenerate-pin': ['admin'],
  'GET /api/admin/square/connect': ['admin'],
  'GET /api/admin/square/callback': ['admin'],
  'GET /api/jobs': ['dispatcher', 'admin'],
  'POST /api/jobs': ['dispatcher', 'admin'],
  // The doc splits this route into two conceptual rows (general
  // dispatcher/admin access vs. a technician's own-job-only restricted
  // access), but both are enforced by this single requireApiRole call --
  // the technician restriction happens in route logic *after* the auth
  // gate, not in the allowed-roles list itself.
  'PATCH /api/jobs/[id]': ['dispatcher', 'admin', 'technician'],
  'POST /api/jobs/[id]/retry-sms': ['dispatcher', 'admin'],
  'POST /api/quotes': ['dispatcher', 'admin'],
  'POST /api/quotes/[id]/line-items': ['dispatcher', 'admin'],
  'PATCH /api/quotes/[id]/line-items/[itemId]': ['dispatcher', 'admin'],
  'DELETE /api/quotes/[id]/line-items/[itemId]': ['dispatcher', 'admin'],
  'PATCH /api/quotes/[id]/accept': ['dispatcher', 'admin'],
  'POST /api/send-sms': ['dispatcher', 'admin'],
  'PATCH /api/company': ['admin'],
}

const actualEntries = collectRouteFiles(API_ROOT).flatMap(extractMatrixEntries)
const actualByKey = new Map(actualEntries.map((e) => [e.key, e.roles]))

describe('API authorization matrix (issue #63)', () => {
  it('found requireApiRole call sites to check (guards against a silently-broken parser)', () => {
    // If a future refactor changes the route-handler shape (e.g. arrow
    // functions) enough that the regexes above stop matching anything, the
    // two checks below would vacuously pass. This keeps that failure loud.
    expect(actualEntries.length).toBeGreaterThanOrEqual(Object.keys(EXPECTED_MATRIX).length)
  })

  it.each(actualEntries.map((e): [string, string[]] => [e.key, e.roles]))(
    'code requireApiRole site %s is documented with matching roles',
    (key, roles) => {
      expect(
        Object.prototype.hasOwnProperty.call(EXPECTED_MATRIX, key),
        `Undocumented requireApiRole call site: ${key}. Add it to docs/AUTHORIZATION.md's matrix and to EXPECTED_MATRIX in this file.`,
      ).toBe(true)
      expect(
        [...roles].sort(),
        `${key}: code's allowed roles ${JSON.stringify(roles)} do not match documented roles ${JSON.stringify(EXPECTED_MATRIX[key])}`,
      ).toEqual([...(EXPECTED_MATRIX[key] ?? [])].sort())
    },
  )

  it.each(Object.entries(EXPECTED_MATRIX))(
    'documented entry %s still has a matching requireApiRole call site',
    (key, roles) => {
      const actual = actualByKey.get(key)
      expect(
        actual,
        `No requireApiRole call found for documented route ${key}. Either the route changed shape, was removed, or docs/AUTHORIZATION.md is stale.`,
      ).toBeDefined()
      expect([...(actual ?? [])].sort()).toEqual([...roles].sort())
    },
  )
})
