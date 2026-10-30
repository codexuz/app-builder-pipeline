import { app } from '#core/schema'
import { roleAtLeast, type EntityMeta, type Role } from '#core/utils/meta'

// Mirrors the generated RLS policies so the UI only offers what the database will allow.
// The database stays the source of truth; this only decides which buttons to show.
export function usePermissions() {
  const { role, current } = useWorkspace()
  const { user } = useAuth()

  const isAdmin = computed(() => roleAtLeast(role.value, 'admin'))
  // Every app except personal ones has workspaces with several people.
  const teams = app.type !== 'personal'

  // Staff working in /app.
  function can(e: EntityMeta, action: 'create' | 'update' | 'delete', row?: { org_id: string, created_by: string | null }) {
    if (action === 'create' && e.createdByFunction) return false
    if (!roleAtLeast(role.value, e.permissions[action])) return false
    if (!row) return true
    if (row.org_id !== current.value?.id) return false
    const ownOnly = action !== 'create' && (e.access === 'private' || (e.access === 'team' && e.own.includes(action)))
    return !ownOnly || isAdmin.value || row.created_by === user.value?.id
  }

  // Customers and visitors on the public site and in the shop.
  function canAsCustomer(e: EntityMeta, action: 'create' | 'update' | 'delete', row?: { created_by: string | null }) {
    if (action === 'create') return isSubmittable(e) && (e.access === 'inbox' || Boolean(user.value))
    if (e.access !== 'customer' || !row || !user.value || row.created_by !== user.value.id) return false
    return e.customerCan.includes(action)
  }

  const hasRole = (min: Role) => roleAtLeast(role.value, min)

  return { can, canAsCustomer, hasRole, isAdmin, teams }
}
