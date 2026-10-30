import { app } from '#core/schema'
import { LANGUAGE_NAMES, type Lang } from '#core/utils/i18n'

// The chosen language: a cookie so server-rendered pages match, and localStorage for the native apps.
export function useLang() {
  const cookie = useCookie<string | undefined>('lang', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  const allowed = app.languages as Lang[]
  const lang = useState<Lang>('lang', () => {
    const stored = cookie.value ?? (import.meta.client ? localStorage.getItem('lang') ?? undefined : undefined)
    return allowed.includes(stored as Lang) ? stored as Lang : allowed[0]!
  })

  function setLang(next: Lang) {
    lang.value = next
    cookie.value = next
    if (import.meta.client) localStorage.setItem('lang', next)
  }

  const options = allowed.map(code => ({ code, label: LANGUAGE_NAMES[code] }))
  return { lang, setLang, options }
}
