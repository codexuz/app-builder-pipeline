import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const user = useState<User | null>('auth:user', () => null)
  const sb = () => useSupabase()
  const origin = () => (useRuntimeConfig().public.webUrl as string) || window.location.origin

  async function signIn(email: string, password: string) {
    const { error } = await sb().auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  // Returns true when the project requires email confirmation before the first sign-in.
  async function signUp(email: string, password: string, fullName: string) {
    const { data, error } = await sb().auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: `${origin()}/login` }
    })
    if (error) throw error
    return !data.session
  }

  async function sendPasswordReset(email: string) {
    const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: `${origin()}/reset-password` })
    if (error) throw error
  }

  async function updatePassword(password: string) {
    const { error } = await sb().auth.updateUser({ password })
    if (error) throw error
  }

  async function signOut() {
    await sb().auth.signOut()
    user.value = null
    useWorkspace().reset()
    await navigateTo('/login')
  }

  return { user, signIn, signUp, sendPasswordReset, updatePassword, signOut }
}
