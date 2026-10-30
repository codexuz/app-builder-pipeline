import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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

// Every file the generator owns, relative to the product folder (apps/<slug>).
export function generatedFiles(spec: NormalizedSpec): Record<string, string> {
  return {
    [CORE_MIGRATION]: readFileSync(CORE_SQL_FILE, 'utf8'),
    [ENTITY_MIGRATION]: generateSql(spec),
    'shared/package.json': generateSharedPackage(spec),
    'shared/schema.ts': generateSchemaTs(spec),
    'shared/icons.json': generateIcons(spec),
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
