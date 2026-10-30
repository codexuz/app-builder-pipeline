import { app } from '#core/schema'
import type { FieldMeta } from '#core/utils/meta'

export const humanize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')

const number = () => new Intl.NumberFormat(app.locale)

// Whole amounts drop the decimals: 350,000 rather than 350,000.00.
export const formatMoney = (v: number) => new Intl.NumberFormat(app.locale, {
  style: 'currency',
  currency: app.currency,
  ...(Number.isInteger(v) ? { maximumFractionDigits: 0 } : {})
}).format(v)

export function formatDate(v: string) {
  // Plain dates are calendar days; parse them as local dates so they never shift across timezones.
  const [y, m, d] = v.slice(0, 10).split('-').map(Number)
  return new Date(y!, m! - 1, d!).toLocaleDateString(app.locale, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const formatDateTime = (v: string) =>
  new Date(v).toLocaleString(app.locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

export function timeAgo(v: string) {
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(app.locale, { numeric: 'auto' })
  if (s < 60) return rtf.format(-s, 'second')
  if (s < 3600) return rtf.format(-Math.round(s / 60), 'minute')
  if (s < 86400) return rtf.format(-Math.round(s / 3600), 'hour')
  if (s < 2592000) return rtf.format(-Math.round(s / 86400), 'day')
  return formatDate(v)
}

// Plain-text rendering used by titles and exports; EntityValue renders the rich version.
export function formatValue(f: FieldMeta, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  switch (f.type) {
    case 'money': return formatMoney(Number(v))
    case 'percent': return `${number().format(Number(v))}%`
    case 'integer':
    case 'number': return number().format(Number(v))
    case 'boolean': return v ? 'Yes' : 'No'
    case 'date': return formatDate(String(v))
    case 'datetime': return formatDateTime(String(v))
    case 'enum': return humanize(String(v))
    case 'tags': return (v as string[]).join(', ') || '—'
    case 'json': return JSON.stringify(v)
    default: return String(v)
  }
}

export const PAYMENT_LABELS: Record<string, string> = { cash: 'Cash on delivery' }

export const optionItems = (f: FieldMeta) => (f.options ?? []).map(o => ({ label: humanize(o), value: o }))

const ENUM_COLORS = ['primary', 'info', 'success', 'warning', 'error', 'secondary', 'neutral'] as const
// Stable badge colour per option; common words get the colour people expect.
export function optionColor(f: FieldMeta, v: string): typeof ENUM_COLORS[number] {
  if (/^(won|done|active|paid|completed|approved|customer|income|yes)$/.test(v)) return 'success'
  if (/^(lost|cancel+ed|rejected|failed|overdue|churned|high|urgent|expense)$/.test(v)) return 'error'
  if (/^(pending|draft|proposal|review|medium|normal)$/.test(v)) return 'warning'
  const i = (f.options ?? []).indexOf(v)
  return ENUM_COLORS[(i < 0 ? 0 : i) % ENUM_COLORS.length]!
}

// Only same-app paths: "//evil.com" and absolute URLs would turn sign-in into an open redirect.
export const safeRedirect = (v: unknown) => typeof v === 'string' && /^\/(?!\/)/.test(v) ? v : '/'
