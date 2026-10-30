import { app } from '#core/schema'
import { currentLang, currentLocale, tl } from '#core/utils/i18n'
import type { FieldMeta } from '#core/utils/meta'

export const humanize = (s: string) => tl(s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '))

const MONTHS_UZ = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr']
const DAYS_UZ = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan']
const AGO_UZ = { second: 'soniya', minute: 'daqiqa', hour: 'soat', day: 'kun' }
const SOM: Record<string, string> = { uz: 'soʻm', ru: 'сум', en: "so'm" }

// Browsers often ship without Uzbek data, and a server may have it when the browser does not, which breaks
// hydration. So Uzbek text is formatted here, never by Intl, and digits group the same way everywhere.
export const formatNumber = (v: number) => {
  const [whole = '0', part] = Math.abs(v).toFixed(Number.isInteger(v) ? 0 : 2).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, currentLang() === 'en' ? ',' : '\u00A0')
  return `${v < 0 ? '-' : ''}${grouped}${part ? `${currentLang() === 'en' ? '.' : ','}${part}` : ''}`
}

export function formatMoney(v: number) {
  if (app.currency === 'UZS') return `${formatNumber(v)}\u00A0${SOM[currentLang()]}`
  return new Intl.NumberFormat(currentLang() === 'uz' ? 'en-US' : currentLocale(), {
    style: 'currency',
    currency: app.currency,
    ...(Number.isInteger(v) ? { maximumFractionDigits: 0 } : {})
  }).format(v)
}

const parts = (d: Date) => ({ day: d.getDate(), month: MONTHS_UZ[d.getMonth()]!, year: d.getFullYear() })

export function formatDate(v: string) {
  // Plain dates are calendar days; parse them as local dates so they never shift across timezones.
  const [y, m, n] = v.slice(0, 10).split('-').map(Number)
  const d = new Date(y!, m! - 1, n!)
  if (currentLang() === 'uz') {
    const p = parts(d)
    return `${p.day}-${p.month}, ${p.year}`
  }
  return d.toLocaleDateString(currentLocale(), { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(v: string) {
  const d = new Date(v)
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${formatDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)}, ${time}`
}

export const dayName = (d: Date) => currentLang() === 'uz' ? DAYS_UZ[d.getDay()]! : d.toLocaleDateString(currentLocale(), { weekday: 'short' })
export const dayDate = (d: Date) => currentLang() === 'uz' ? `${d.getDate()}-${MONTHS_UZ[d.getMonth()]!.slice(0, 3)}` : d.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })

export function timeAgo(v: string) {
  const s = Math.round((Date.now() - new Date(v).getTime()) / 1000)
  const unit = s < 60 ? 'second' : s < 3600 ? 'minute' : s < 86400 ? 'hour' : 'day'
  const n = Math.round(s / { second: 1, minute: 60, hour: 3600, day: 86400 }[unit])
  if (s >= 2592000) return formatDate(v)
  if (currentLang() === 'uz') return `${n} ${AGO_UZ[unit]} oldin`
  return new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' }).format(-n, unit)
}

// Plain-text rendering used by titles and exports; EntityValue renders the rich version.
export function formatValue(f: FieldMeta, v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  switch (f.type) {
    case 'money': return formatMoney(Number(v))
    case 'percent': return `${formatNumber(Number(v))}%`
    case 'integer':
    case 'number': return formatNumber(Number(v))
    case 'boolean': return v ? 'Yes' : 'No'
    case 'date': return formatDate(String(v))
    case 'datetime': return formatDateTime(String(v))
    case 'enum': return humanize(String(v))
    case 'tags': return (v as string[]).join(', ') || '—'
    case 'json': return JSON.stringify(v)
    default: return String(v)
  }
}

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
