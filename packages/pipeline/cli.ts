#!/usr/bin/env node
// Pipeline CLI. Every stage is deterministic; an AI agent drives it via AGENTS.md.
// A product lives in apps/<slug>: app.spec.yaml, supabase/, shared/ (generated schema), web/ (Nuxt UI), mobile/ (Ionic + Capacitor).
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generatedFiles, LOCK_FILE, staleFiles, writeGenerated } from './generate/index.ts'
import { loadSpec, SpecError, type NormalizedSpec } from './spec.ts'
import { verifyDb } from './verify/db.ts'

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const TEMPLATES = join(ROOT, 'templates')
const SPEC_FILE = 'app.spec.yaml'
const SKIP_COPY = /[\\/](node_modules|\.nuxt|\.output|android|ios)([\\/]|$)/

const [command, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter(a => a.startsWith('--')))
const args = rest.filter(a => !a.startsWith('--'))
const flagValue = (name: string) => {
  const i = rest.indexOf(name)
  return i >= 0 ? rest[i + 1] : undefined
}

function fail(message: string): never {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function specOf(path: string): NormalizedSpec {
  try {
    return loadSpec(path)
  } catch (err) {
    if (err instanceof SpecError) fail(err.message)
    throw err
  }
}

// Accepts a product folder (apps/acme-crm) or just its slug (acme-crm).
function productDirOf(arg: string | undefined): string {
  if (!arg) fail('pass the product folder, e.g. apps/acme-crm')
  const candidates = [resolve(arg), join(ROOT, 'apps', arg)]
  const dir = candidates.find(d => existsSync(join(d, SPEC_FILE)))
  if (!dir) fail(`${arg} has no ${SPEC_FILE}. Pass a product folder such as apps/acme-crm.`)
  return dir
}

// Commands are fixed strings from this file, never user input, so a shell line is safe (and needed for npm on Windows).
// npm passes its own settings to scripts as npm_config_*; a nested npm install must not inherit them.
function run(line: string, cwd = ROOT): boolean {
  console.log(`\n$ ${line}`)
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^npm_config_/i.test(k)))
  return spawnSync(line, { cwd, stdio: 'inherit', shell: true, env }).status === 0
}

async function dbCheck(spec: NormalizedSpec, migrations: { name: string, sql: string }[]): Promise<boolean> {
  const results = await verifyDb(spec, migrations)
  for (const r of results) console.log(`${r.ok ? '  ✓' : '  ✖'} ${r.name}${r.detail ? `\n      ${r.detail}` : ''}`)
  const failed = results.filter(r => !r.ok).length
  console.log(`\n${results.length - failed}/${results.length} database checks passed`)
  return failed === 0
}

function migrationsOf(productDir: string) {
  const dir = join(productDir, 'supabase/migrations')
  return readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
    .map(name => ({ name, sql: readFileSync(join(dir, name), 'utf8') }))
}

// Template package names (@app/web, @app/shared) become @<slug>/web etc.
function renamePackages(file: string, slug: string) {
  writeFileSync(file, readFileSync(file, 'utf8').replace(/@app\/(web|mobile|shared)/g, `@${slug}/$1`))
}

const commands: Record<string, () => Promise<void> | void> = {
  validate() {
    const spec = specOf(args[0] ?? join(productDirOf(undefined), SPEC_FILE))
    console.log(`✓ ${spec.app.name}: ${spec.entities.length} entities, ${spec.app.tenancy} tenancy`)
    for (const e of spec.entities) {
      console.log(`  - ${e.name} (/${e.slug}) ${e.fields.length} fields, visibility ${e.visibility}`)
    }
  },

  new() {
    const specPath = args[0] ?? fail('usage: new <spec.yaml> [--out <dir>] [--no-install]')
    const spec = specOf(specPath)
    const slug = spec.app.slug
    const out = resolve(flagValue('--out') ?? join(ROOT, 'apps', slug))
    if (existsSync(out) && readdirSync(out).length) fail(`${out} already exists and is not empty`)
    for (const part of ['web', 'mobile']) {
      const from = join(TEMPLATES, part)
      cpSync(from, join(out, part), { recursive: true, filter: src => !SKIP_COPY.test(src.slice(from.length)) })
      renamePackages(join(out, part, 'package.json'), slug)
    }
    renamePackages(join(out, 'web/vercel.json'), slug)
    cpSync(specPath, join(out, SPEC_FILE))
    mkdirSync(join(out, 'supabase'), { recursive: true })
    writeFileSync(join(out, 'supabase/config.toml'), `project_id = "${slug}"\n`)
    const res = writeGenerated(out, spec)
    console.log(`✓ Created ${spec.app.name} in ${out}`)
    console.log(`  web: @${slug}/web (Nuxt UI)  mobile: @${slug}/mobile (Ionic + Capacitor)`)
    console.log(`  generated: ${res.written.join(', ')}`)
    if (!flags.has('--no-install') && !run('npm install --no-audit --no-fund')) fail('npm install failed')
    console.log(`\nNext: npm run verify -- apps/${slug}`)
  },

  generate() {
    const dir = productDirOf(args[0])
    const res = writeGenerated(dir, specOf(join(dir, SPEC_FILE)))
    if (res.written.length) console.log(`✓ wrote ${res.written.join(', ')}`)
    if (res.unchanged.length) console.log(`  unchanged: ${res.unchanged.join(', ')}`)
    if (res.skipped.length) {
      console.log(`\n! ${res.skipped.join(', ')} not rewritten: the schema is deployed (${LOCK_FILE}).`)
      console.log('  Write the change as a new migration in supabase/migrations with a later timestamp.')
      console.log('  `npm run verify` replays all migrations, so it will catch mismatches.')
    }
  },

  async 'verify-db'() {
    const target = args[0] ?? fail('usage: verify-db <spec.yaml|product folder>')
    let ok: boolean
    if (/\.ya?ml$/.test(target)) {
      const spec = specOf(target)
      const files = generatedFiles(spec)
      ok = await dbCheck(spec, Object.entries(files).filter(([k]) => k.endsWith('.sql')).sort()
        .map(([name, sql]) => ({ name: name.split('/').pop()!, sql })))
    } else {
      const dir = productDirOf(target)
      ok = await dbCheck(specOf(join(dir, SPEC_FILE)), migrationsOf(dir))
    }
    if (!ok) process.exit(1)
  },

  async verify() {
    const dir = productDirOf(args[0])
    const spec = specOf(join(dir, SPEC_FILE))
    const slug = spec.app.slug
    console.log('▶ 1/3 spec is valid')
    const stale = staleFiles(dir, spec)
    if (stale.length) fail(`generated files are out of date: ${stale.join(', ')}\n  run: npm run generate -- apps/${slug}`)
    console.log('▶ 2/3 database: migrations, RLS and tenancy')
    if (!(await dbCheck(spec, migrationsOf(dir)))) fail('database checks failed')
    if (!existsSync(join(ROOT, 'node_modules/.bin'))) fail('run npm install at the repository root first')
    console.log('\n▶ 3/3 typecheck and production build (web + mobile, via Turborepo)')
    if (!run(`npx turbo run typecheck build --filter=@${slug}/web --filter=@${slug}/mobile --output-logs=errors-only`)) {
      fail('typecheck or build failed (rerun with --output-logs=full for details)')
    }
    console.log('\n✓ All checks passed. Ready to deploy (see AGENTS.md, stage 5).')
  },

  lock() {
    const dir = productDirOf(args[0])
    mkdirSync(join(dir, '.pipeline'), { recursive: true })
    writeFileSync(join(dir, LOCK_FILE), `${new Date().toISOString()}\n`)
    console.log('✓ Locked. Generated migrations are frozen; add new migrations for schema changes.')
  }
}

const handler = command ? commands[command] : undefined
if (!handler) {
  console.log(`Usage: npm run <command> -- <args>

  validate <spec.yaml>            check a spec and print what it describes
  new <spec.yaml>                 create apps/<slug> (web + mobile + shared + supabase) and install
  generate <product>              regenerate SQL, schema, icons, theme and config from app.spec.yaml
  verify-db <spec.yaml|product>   run migrations in PGlite and test RLS/tenancy
  verify <product>                spec + generated files + database + typecheck + build (web and mobile)
  lock <product>                  mark the schema as deployed (after the first db push)`)
  process.exit(command ? 1 : 0)
}
await handler()
