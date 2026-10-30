// Restores the session before the first route resolves, then keeps auth state in sync.
export default defineNuxtPlugin({
  name: 'auth',
  async setup() {
    if (!isSupabaseConfigured()) return
    const { user } = useAuth()
    const sb = useSupabase()
    const { data } = await sb.auth.getSession()
    user.value = data.session?.user ?? null

    sb.auth.onAuthStateChange((event, session) => {
      const previous = user.value?.id
      user.value = session?.user ?? null
      if (event === 'PASSWORD_RECOVERY') navigateTo('/reset-password')
      if (event === 'SIGNED_OUT' || (previous && previous !== user.value?.id)) useWorkspace().reset()
    })
  }
})
