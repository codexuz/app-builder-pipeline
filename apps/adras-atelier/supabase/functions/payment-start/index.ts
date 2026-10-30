// Called by the app for a signed-in customer: returns the provider page to pay an order on.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { clickPayUrl, paymePayUrl, stripeAmount } from '../_shared/protocols.ts'
import { cors, env, json, utf8Base64 } from '../_shared/shop.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { order_id: orderId, return_url: returnUrl } = await req.json()
    // The caller's own session: RLS guarantees they can only pay their own orders.
    const authorization = req.headers.get('authorization') ?? ''
    const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), {
      global: { headers: { authorization } },
      auth: { persistSession: false }
    })
    const { data: order, error } = await client.from('shop_order')
      .select('id, number, total, status, payment_status, payment_method')
      .eq('id', orderId).maybeSingle()
    if (error) throw error
    if (!order) return json({ error: 'Order not found' }, 404)
    if (order.status === 'cancelled') return json({ error: 'This order was cancelled' }, 409)
    if (order.payment_status === 'paid') return json({ error: 'This order is already paid' }, 409)

    const site = env('PUBLIC_SITE_URL').replace(/\/$/, '')
    const back = typeof returnUrl === 'string' && returnUrl.startsWith(site) ? returnUrl : `${site}/orders/${order.id}`
    const amount = Number(order.total)

    switch (order.payment_method) {
      case 'click':
        return json({ url: clickPayUrl({ serviceId: env('CLICK_SERVICE_ID'), merchantId: env('CLICK_MERCHANT_ID'), amount, orderId: order.id, returnUrl: back }) })
      case 'payme':
        return json({ url: paymePayUrl({ merchantId: env('PAYME_MERCHANT_ID'), amount, orderId: order.id, returnUrl: back }, utf8Base64) })
      case 'stripe': {
        const currency = env('SHOP_CURRENCY').toLowerCase()
        const body = new URLSearchParams({
          'mode': 'payment',
          'success_url': back,
          'cancel_url': back,
          'client_reference_id': order.id,
          'metadata[order_id]': order.id,
          'line_items[0][quantity]': '1',
          'line_items[0][price_data][currency]': currency,
          'line_items[0][price_data][unit_amount]': String(stripeAmount(amount, currency)),
          'line_items[0][price_data][product_data][name]': `Order #${order.number}`
        })
        const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
          method: 'POST',
          headers: { 'authorization': `Bearer ${env('STRIPE_SECRET_KEY')}`, 'content-type': 'application/x-www-form-urlencoded' },
          body
        })
        const session = await res.json()
        if (!res.ok) throw new Error(session.error?.message ?? 'Stripe refused the payment')
        return json({ url: session.url })
      }
      default:
        return json({ error: 'This order is paid on delivery' }, 400)
    }
  } catch (err) {
    console.error(err)
    return json({ error: 'Could not start the payment' }, 500)
  }
})
