// Stripe webhook: marks an order paid when Checkout completes.
import { fromStripeAmount, parseStripeSignature, stripeFresh } from '../_shared/protocols.ts'
import { confirmPayment, env, json } from '../_shared/shop.ts'

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  const raw = await req.text()
  const { timestamp, signature } = parseStripeSignature(req.headers.get('stripe-signature'))
  if (!timestamp || !signature || !stripeFresh(timestamp, Date.now() / 1000)) return json({ error: 'bad signature' }, 400)
  if (await hmacHex(env('STRIPE_WEBHOOK_SECRET'), `${timestamp}.${raw}`) !== signature) return json({ error: 'bad signature' }, 400)

  const event = JSON.parse(raw)
  if (event.type === 'checkout.session.completed' && event.data.object.payment_status === 'paid') {
    const session = event.data.object
    try {
      await confirmPayment(session.metadata.order_id, 'stripe', session.id, fromStripeAmount(session.amount_total, session.currency), { event: event.id })
    } catch (err) {
      // Stripe retries on failure, so answer with an error for genuine problems only.
      console.error(err)
      return json({ error: 'could not record the payment' }, 500)
    }
  }
  return json({ received: true })
})
