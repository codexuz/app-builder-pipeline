import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | undefined
let serverClient: SupabaseClient | undefined

export function isSupabaseConfigured() {
  const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
  return Boolean(supabaseUrl && supabaseKey)
}

// Browser/app: one client with the signed-in session (localStorage, also inside the Capacitor web view).
// Server (public pages rendered for search engines): a session-less client that reads as a visitor,
// so row-level security only ever returns public data there.
export function useSupabase(): SupabaseClient {
  const { supabaseUrl, supabaseKey } = useRuntimeConfig().public
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase is not configured: set NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_KEY')
  }
  if (import.meta.server) {
    serverClient ??= createClient(supabaseUrl as string, supabaseKey as string, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    })
    return serverClient
  }
  client ??= createClient(supabaseUrl as string, supabaseKey as string, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  })
  return client
}
