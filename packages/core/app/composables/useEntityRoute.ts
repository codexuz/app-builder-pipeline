import { entityBySlug, type EntityMeta } from '#core/utils/meta'

// Reads the router directly: under Ionic's router outlet, Nuxt's useRoute() lags one page behind.
export function useEntityRoute(): EntityMeta {
  const route = useRouter().currentRoute.value
  const entity = entityBySlug(String(route.params.entity))
  if (!entity) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
  return entity
}
