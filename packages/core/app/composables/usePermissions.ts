import { app } from '#core/schema'
import { roleAtLeast, type EntityMeta, type Role } from '#core/utils/meta'

// Mirrors the generated RLS policies so the UI only offers what the database will allow.
// The database stays the source of truth; this only hides buttons.
export function usePermissions() {
  const { role, current } = useWorkspace()
  const { user } = useAuth()

  const isAdmin = computed(() => roleAtLeast(role.value, 'admin'))
  const teams = app.tenancy === 'org'

  function can(e: EntityMeta, action: 'create' | 'update' | 'delete', row?: { org_id: string, created_by: string | null }) {
    if (!roleAtLeast(role.value, e.permissions[action])) return false
    if (!row) return true
    if (row.org_id !== current.value?.id) return false
    const ownOnly = action !== 'create' && (e.own.includes(action) || e.visibility === 'own')
    return !ownOnly || isAdmin.value || row.created_by === user.value?.id
  }

  const hasRole = (min: Role) => roleAtLeast(role.value, min)

  return { can, hasRole, isAdmin, teams }
}
