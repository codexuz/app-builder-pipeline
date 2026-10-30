import { createClient } from 'npm:@supabase/supabase-js@2'

export const env = (name: string) => {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing secret ${name}`)
  return v
}

// Bypasses RLS: only provider webhooks use this, after verifying the provider's signature.
export const serviceClient = () => createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false }
})

export const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type'
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...cors } })

export const utf8Base64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))

export async function orderById(id: string) {
  const { data } = await serviceClient().from('shop_order')
    .select('id, number, total, status, payment_status')
    .eq('id', id).maybeSingle()
  return data ? { ...data, total: Number(data.total) } : null
}

export async function confirmPayment(orderId: string, provider: string, externalId: string, amount: number, payload?: unknown) {
  const { error } = await serviceClient().rpc('confirm_payment', {
    p_order: orderId, p_provider: provider, p_external_id: externalId, p_amount: amount, p_payload: payload ?? null
  })
  if (error) throw error
}
