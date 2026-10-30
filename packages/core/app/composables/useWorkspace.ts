import { app } from '#core/schema'
import type { Role } from '#core/utils/meta'

export interface Workspace { id: string, name: string, personal: boolean, role: Role }

const storageKey = () => `${app.slug}:workspace`

export function useWorkspace() {
  const list = useState<Workspace[]>('ws:list', () => [])
  const currentId = useState<string | null>('ws:current', () => null)
  const loaded = useState('ws:loaded', () => false)
  const current = computed(() => list.value.find(w => w.id === currentId.value) ?? null)
  const role = computed(() => current.value?.role)

  async function load() {
    const { user } = useAuth()
    if (!user.value) return
    const { data, error } = await useSupabase()
      .from('memberships')
      .select('role, organizations!inner(id, name, personal)')
      .eq('user_id', user.value.id)
    if (error) throw error
    list.value = (data ?? []).map((m: any) => ({ ...m.organizations, role: m.role }))
      .sort((a, b) => Number(b.personal) - Number(a.personal) || a.name.localeCompare(b.name))
    const saved = localStorage.getItem(storageKey())
    currentId.value = list.value.find(w => w.id === saved)?.id ?? list.value[0]?.id ?? null
    loaded.value = true
  }

  function select(id: string) {
    currentId.value = id
    localStorage.setItem(storageKey(), id)
  }

  async function create(name: string, personal = false) {
    const { data, error } = await useSupabase().rpc('create_organization', { p_name: name, p_personal: personal })
    if (error) throw error
    await load()
    select(data as string)
    return data as string
  }

  // User-tenancy accounts get their workspace from the sign-up trigger; this covers accounts created before it existed.
  async function ensurePersonal() {
    if (!list.value.length) await create('Personal', true)
  }

  function reset() {
    list.value = []
    currentId.value = null
    loaded.value = false
  }

  return { list, current, role, loaded, load, select, create, ensurePersonal, reset }
}
