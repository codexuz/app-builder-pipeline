import { commerce } from '#core/schema'

// Online methods hand over to the provider's own payment page; cash needs nothing.
export function usePayment() {
  const isOnline = (method?: string) => Boolean(method) && method !== 'cash'
  const hasOnline = (commerce?.payments ?? []).some(isOnline)

  async function start(orderId: string) {
    const { data, error } = await useSupabase().functions.invoke('payment-start', {
      body: { order_id: orderId, return_url: `${window.location.origin}/orders/${orderId}` }
    })
    if (error) throw error
    if (!data?.url) throw new Error(data?.error ?? 'No payment link')
    window.location.assign(data.url)
  }

  return { isOnline, hasOnline, start }
}
