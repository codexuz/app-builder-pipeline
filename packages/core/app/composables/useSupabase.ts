import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
  return Boolean(supabaseUrl && supabaseKey)
}

export function useSupabase(): SupabaseClient {
  if (!client) {
    const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase is not configured: set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_KEY')
    }
    // Session lives in localStorage, which works in browsers and in the Capacitor web view.
    client = createClient(supabaseUrl as string, supabaseKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    })
  }
  return client
}
