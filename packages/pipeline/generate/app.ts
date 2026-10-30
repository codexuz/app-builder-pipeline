import type { Entity, Field, NormalizedSpec } from '../spec.ts'

const HEADER = '// GENERATED from app.spec.yaml by the pipeline. Do not edit; change the spec and regenerate.'

const pascal = (s: string) => s.split('_').map(w => w[0]!.toUpperCase() + w.slice(1)).join('')

function tsType(f: Field): string {
  const base = {
    integer: 'number', number: 'number', money: 'number', percent: 'number',
    boolean: 'boolean', tags: 'string[]', json: 'unknown'
  }[f.type as string] ?? 'string'
  return f.required || f.type === 'boolean' || f.type === 'tags' ? base : `${base} | null`
}

function rowInterface(e: Entity): string {
  const lines = [
    'id: string',
    'org_id: string',
    ...e.fields.map(f => `${f.name}: ${tsType(f)}`),
    'created_by: string | null',
    'created_at: string',
    'updated_at: string'
  ]
  return `export interface ${pascal(e.name)} {\n  ${lines.join('\n  ')}\n}`
}

// Drops generator-only keys so the runtime metadata stays small.
function entityMeta(e: Entity) {
  return {
    name: e.name,
    label: e.label,
    plural: e.plural,
    slug: e.slug,
    icon: e.icon,
    title: e.title,
    description: e.description,
    fields: e.fields.map(({ cascade: _c, ...f }) => f),
    builtIn: e.builtIn,
    permissions: e.permissions,
    access: e.access,
    own: e.own,
    customerCan: e.customerCan,
    publicRead: e.publicRead,
    createdByFunction: e.createdByFunction,
    attachments: e.attachments,
    realtime: e.realtime,
    sort: e.sort,
    nav: e.nav,
    children: e.children
  }
}

// Plain data, no imports: the core layer (#core/schema) gives it its types.
export function generateSchemaTs(spec: NormalizedSpec): string {
  const json = (v: unknown) => JSON.stringify(v, null, 2)
  return `${HEADER}
export const app = ${json(spec.app)}

export const entities = ${json(spec.entities.map(entityMeta))}

export const dashboard = ${json(spec.dashboard)}

export const commerce = ${json(spec.commerce ?? null)}

export const scheduling = ${json(spec.scheduling ?? null)}

export const site = ${json(spec.site ?? null)}

export const translations = ${json(spec.translations)}

${spec.entities.map(rowInterface).join('\n\n')}
`
}

export function generateSharedPackage(spec: NormalizedSpec): string {
  return `${JSON.stringify({
    name: `@${spec.app.slug}/shared`,
    private: true,
    type: 'module',
    description: `Generated schema for ${spec.app.name}, shared by its web and mobile apps.`,
    main: './schema.ts'
  }, null, 2)}\n`
}

// Icons named by the spec, bundled into both apps so they work offline.
export function generateIcons(spec: NormalizedSpec): string {
  const icons = new Set<string>()
  for (const e of spec.entities) icons.add(e.icon)
  for (const c of spec.dashboard) if (c.type !== 'breakdown' && c.icon) icons.add(c.icon)
  return `${JSON.stringify([...icons].sort().map(i => i.replace(/^i-([a-z0-9]+)-/, '$1:')), null, 2)}\n`
}

export function generateWebAppConfig(spec: NormalizedSpec): string {
  return `${HEADER}
export default defineAppConfig({
  style: '${spec.app.style}',
  ui: {
    colors: {
      primary: '${spec.app.color}',
      neutral: 'zinc'
    }
  }
})
`
}

export function generateCapacitorConfig(spec: NormalizedSpec): string {
  return `${HEADER}
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: '${spec.app.appId}',
  appName: ${JSON.stringify(spec.app.name)},
  webDir: '.output/public'
}

export default config
`
}

// Tailwind 600 shades, so the mobile app matches the web app's primary colour.
const PALETTE: Record<string, string> = {
  red: '#dc2626', orange: '#ea580c', amber: '#d97706', yellow: '#ca8a04', lime: '#65a30d', green: '#16a34a',
  emerald: '#059669', teal: '#0d9488', cyan: '#0891b2', sky: '#0284c7', blue: '#2563eb', indigo: '#4f46e5',
  violet: '#7c3aed', purple: '#9333ea', fuchsia: '#c026d3', pink: '#db2777', rose: '#e11d48'
}

function mix(hex: string, target: number, amount: number) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  const out = rgb.map(c => Math.round(c + (target - c) * amount))
  return { hex: `#${out.map(c => c.toString(16).padStart(2, '0')).join('')}`, rgb: out.join(', ') }
}

export function generateIonicTheme(spec: NormalizedSpec): string {
  const base = PALETTE[spec.app.color]!
  const rgb = mix(base, 0, 0).rgb
  return `/* GENERATED from app.spec.yaml by the pipeline. Do not edit. */
:root {
  --ion-color-primary: ${base};
  --ion-color-primary-rgb: ${rgb};
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: ${mix(base, 0, 0.12).hex};
  --ion-color-primary-tint: ${mix(base, 255, 0.1).hex};
}
`
}
