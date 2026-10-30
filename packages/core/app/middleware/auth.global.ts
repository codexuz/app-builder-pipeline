import { app } from '#core/schema'

const PUBLIC = new Set(['/login', '/forgot-password', '/setup'])
const TEAM_ONLY = new Set(['/onboarding', '/settings/members', '/settings'])

export default defineNuxtRouteMiddleware(async (to) => {
  if (!isSupabaseConfigured()) return to.path === '/setup' ? undefined : navigateTo('/setup')

  const { user } = useAuth()
  const isPublic = PUBLIC.has(to.path) || to.path.startsWith('/invite/')
  if (!user.value) {
    if (isPublic) return
    return navigateTo({ path: '/login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } })
  }
  if (to.path === '/login') return navigateTo(safeRedirect(to.query.redirect))
  if (to.path.startsWith('/invite/') || to.path === '/reset-password') return

  const ws = useWorkspace()
  if (!ws.loaded.value) {
    try {
      await ws.load()
    } catch (err) {
      throw createError({ statusCode: 503, statusMessage: friendlyError(err), fatal: true })
    }
  }

  if (app.tenancy === 'user') {
    if (!ws.current.value) await ws.ensurePersonal()
    if (TEAM_ONLY.has(to.path)) return navigateTo(to.path === '/onboarding' ? '/' : '/settings/profile')
    return
  }
  if (!ws.current.value && to.path !== '/onboarding' && to.path !== '/settings/profile') return navigateTo('/onboarding')
})
