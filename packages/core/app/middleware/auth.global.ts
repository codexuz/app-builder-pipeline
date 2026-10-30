import { app } from '#core/schema'

// Pages that need an account. Everything else (the public site, catalog, cart) is open to visitors.
const ACCOUNT_PAGES = new Set(['/checkout', '/account', '/reset-password'])
const TEAM_ONLY = new Set(['/app/onboarding', '/app/settings/members', '/app/settings'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (!isSupabaseConfigured()) return to.path === '/setup' ? undefined : navigateTo('/setup')
  // Team and personal apps have no public site: their home is the workspace.
  if (to.path === '/' && !app.publicSite) return navigateTo('/app', { replace: true })
  // Public pages render on the server as a visitor; sessions only exist in the browser/app.
  if (import.meta.server) return

  const { user } = useAuth()
  const inApp = inWorkspaceArea(to.path)
  if (!user.value) {
    if (!inApp && !ACCOUNT_PAGES.has(to.path)) return
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
  if (to.path === '/login') return navigateTo(safeRedirect(to.query.redirect))
  if (!inApp) return

  const ws = useWorkspace()
  if (!ws.loaded.value) {
    try {
      await ws.load()
    } catch (err) {
      throw createError({ statusCode: 503, statusMessage: friendlyError(err), fatal: true })
    }
  }

  if (app.type === 'personal') {
    if (!ws.current.value) await ws.ensurePersonal()
    if (TEAM_ONLY.has(to.path)) return navigateTo(to.path === '/app/onboarding' ? '/app' : '/app/settings/profile')
    return
  }
  if (ws.current.value) return
  // Signed in but not staff: in a business app that is a customer, whose home is the account page.
  if (app.type === 'business' && await useShop().loadBusinessOrg()) return navigateTo('/account')
  if (to.path === '/app/onboarding' || to.path === '/app/settings/profile') return
  return navigateTo('/app/onboarding')
})
