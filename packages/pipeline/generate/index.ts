import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NormalizedSpec } from '../spec.ts'
import {
  generateCapacitorConfig, generateIcons, generateIonicTheme, generateSchemaTs, generateSharedPackage, generateWebAppConfig
} from './app.ts'
import { generateSql } from './sql.ts'

export const CORE_MIGRATION = 'supabase/migrations/20250101000000_core.sql'
export const ENTITY_MIGRATION = 'supabase/migrations/20250101000100_app_entities.sql'
// Written by `pipeline lock` after the first `supabase db push`; from then on the schema evolves through new migrations.
export const LOCK_FILE = '.pipeline/deployed.lock'
const MIGRATIONS = new Set([CORE_MIGRATION, ENTITY_MIGRATION])

export const CORE_SQL_FILE = fileURLToPath(new URL('../../core/supabase/20250101000000_core.sql', import.meta.url))

const FUNCTIONS_DIR = fileURLToPath(new URL('../../core/functions', import.meta.url))

// Edge Functions for the online payment methods the spec turns on.
function paymentFunctions(spec: NormalizedSpec): Record<string, string> {
  const online = (spec.commerce?.payments ?? []).filter(m => m !== 'cash')
  if (!online.length) return {}
  const dirs = ['_shared', 'payment-start', ...online.map(m => `payment-${m}`)]
  return Object.fromEntries(dirs.flatMap(dir => readdirSync(join(FUNCTIONS_DIR, dir)).map(file =>
    [`supabase/functions/${dir}/${file}`, readFileSync(join(FUNCTIONS_DIR, dir, file), 'utf8')])))
}

// Webhooks are called by the providers, so they prove themselves by signature instead of a user session.
function supabaseConfig(spec: NormalizedSpec): string {
  const hooks = (spec.commerce?.payments ?? []).filter(m => m !== 'cash')
  return [`project_id = "${spec.app.slug}"`, ...hooks.map(m => `\n[functions.payment-${m}]\nverify_jwt = false`)].join('\n') + '\n'
}

// Every file the generator owns, relative to the product folder (apps/<slug>).
export function generatedFiles(spec: NormalizedSpec): Record<string, string> {
  return {
    ...paymentFunctions(spec),
    'supabase/config.toml': supabaseConfig(spec),
    [CORE_MIGRATION]: readFileSync(CORE_SQL_FILE, 'utf8'),
    [ENTITY_MIGRATION]: generateSql(spec),
    'shared/package.json': generateSharedPackage(spec),
    'shared/schema.ts': generateSchemaTs(spec),
    'shared/icons.json': generateIcons(spec),
    'shared/app.json': `${JSON.stringify({ style: spec.app.style }, null, 2)}\n`,
    'web/app/app.config.ts': generateWebAppConfig(spec),
    'mobile/capacitor.config.ts': generateCapacitorConfig(spec),
    'mobile/app/assets/css/theme.css': generateIonicTheme(spec)
  }
}

export interface WriteResult { written: string[], unchanged: string[], skipped: string[] }

export function writeGenerated(productDir: string, spec: NormalizedSpec): WriteResult {
  const locked = existsSync(join(productDir, LOCK_FILE))
  const result: WriteResult = { written: [], unchanged: [], skipped: [] }
  for (const [rel, content] of Object.entries(generatedFiles(spec))) {
    const file = join(productDir, rel)
    const current = existsSync(file) ? readFileSync(file, 'utf8') : undefined
    if (current === content) { result.unchanged.push(rel); continue }
    if (locked && MIGRATIONS.has(rel)) { result.skipped.push(rel); continue }
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
    result.written.push(rel)
  }
  return result
}

// Files that differ from what the spec would generate (used by `verify`).
export function staleFiles(productDir: string, spec: NormalizedSpec): string[] {
  const locked = existsSync(join(productDir, LOCK_FILE))
  return Object.entries(generatedFiles(spec))
    .filter(([rel]) => !(locked && MIGRATIONS.has(rel)))
    .filter(([rel, content]) => {
      const file = join(productDir, rel)
      return !existsSync(file) || readFileSync(file, 'utf8') !== content
    })
    .map(([rel]) => rel)
}
