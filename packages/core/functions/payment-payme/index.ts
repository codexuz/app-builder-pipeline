// Payme Merchant API (JSON-RPC). Transaction states: 1 created, 2 paid, -1 cancelled before paying, -2 cancelled after.
import { PAYME_ERRORS, paymeAuthorized, toTiyin } from '../_shared/protocols.ts'
import { confirmPayment, env, json, orderById, serviceClient, utf8Base64 } from '../_shared/shop.ts'

const TIMEOUT_MS = 12 * 60 * 60 * 1000

interface Event { id: string, order_id: string, external_id: string, amount: number, state: string, payload: Record<string, any> | null }

const events = () => serviceClient().from('payment_event')
const find = async (id: string) => (await events().select('*').eq('provider', 'payme').eq('external_id', id).maybeSingle()).data as Event | null
const stateOf = (e: Event) => ({ created: 1, paid: 2, cancelled: -1, refunded: -2 } as Record<string, number>)[e.state] ?? 1

Deno.serve(async (req) => {
  const { id, method, params } = await req.json()
  const fail = (e: (typeof PAYME_ERRORS)[keyof typeof PAYME_ERRORS]) => json({ id, error: e })
  const ok = (result: unknown) => json({ id, result })

  if (!paymeAuthorized(req.headers.get('authorization'), env('PAYME_KEY'), utf8Base64)) return fail(PAYME_ERRORS.auth)

  async function payable(amount: number, orderId?: string) {
    const order = orderId ? await orderById(orderId).catch(() => null) : null
    if (!order || order.status === 'cancelled' || order.payment_status === 'paid') return { error: PAYME_ERRORS.order }
    if (toTiyin(order.total) !== amount) return { error: PAYME_ERRORS.amount }
    return { order }
  }

  try {
    switch (method) {
      case 'CheckPerformTransaction': {
        const { error } = await payable(params.amount, params.account?.order_id)
        return error ? fail(error) : ok({ allow: true })
      }
      case 'CreateTransaction': {
        const existing = await find(params.id)
        if (existing) {
          if (existing.state !== 'created') return fail(PAYME_ERRORS.perform)
          return ok({ create_time: existing.payload?.time, transaction: existing.id, state: 1 })
        }
        const { order, error } = await payable(params.amount, params.account?.order_id)
        if (error) return fail(error)
        const { data: open } = await events().select('id').eq('order_id', order!.id).eq('provider', 'payme').eq('state', 'created').limit(1)
        if (open?.length) return fail(PAYME_ERRORS.busy)
        const { data, error: insertError } = await events().insert({
          order_id: order!.id, provider: 'payme', external_id: params.id, amount: order!.total, state: 'created', payload: { time: params.time }
        }).select('id').single()
        if (insertError) throw insertError
        return ok({ create_time: params.time, transaction: data.id, state: 1 })
      }
      case 'PerformTransaction': {
        const tx = await find(params.id)
        if (!tx) return fail(PAYME_ERRORS.transaction)
        if (tx.state === 'paid') return ok({ transaction: tx.id, perform_time: tx.payload?.perform_time, state: 2 })
        if (tx.state !== 'created' || Date.now() - Number(tx.payload?.time) > TIMEOUT_MS) return fail(PAYME_ERRORS.perform)
        const performTime = Date.now()
        await confirmPayment(tx.order_id, 'payme', params.id, Number(tx.amount))
        await events().update({ payload: { ...tx.payload, perform_time: performTime } }).eq('id', tx.id)
        return ok({ transaction: tx.id, perform_time: performTime, state: 2 })
      }
      case 'CancelTransaction': {
        const tx = await find(params.id)
        if (!tx) return fail(PAYME_ERRORS.transaction)
        if (tx.state === 'cancelled' || tx.state === 'refunded') {
          return ok({ transaction: tx.id, cancel_time: tx.payload?.cancel_time, state: stateOf(tx) })
        }
        const cancelTime = Date.now()
        const wasPaid = tx.state === 'paid'
        await events().update({ state: wasPaid ? 'refunded' : 'cancelled', payload: { ...tx.payload, cancel_time: cancelTime, reason: params.reason } }).eq('id', tx.id)
        if (wasPaid) await serviceClient().from('shop_order').update({ payment_status: 'refunded' }).eq('id', tx.order_id)
        return ok({ transaction: tx.id, cancel_time: cancelTime, state: wasPaid ? -2 : -1 })
      }
      case 'CheckTransaction': {
        const tx = await find(params.id)
        if (!tx) return fail(PAYME_ERRORS.transaction)
        return ok({
          create_time: tx.payload?.time ?? 0,
          perform_time: tx.payload?.perform_time ?? 0,
          cancel_time: tx.payload?.cancel_time ?? 0,
          transaction: tx.id,
          state: stateOf(tx),
          reason: tx.payload?.reason ?? null
        })
      }
      case 'GetStatement': {
        const { data } = await events().select('*').eq('provider', 'payme')
          .gte('created_at', new Date(params.from).toISOString()).lte('created_at', new Date(params.to).toISOString())
        return ok({
          transactions: ((data ?? []) as Event[]).map(tx => ({
            id: tx.external_id,
            time: tx.payload?.time,
            amount: toTiyin(Number(tx.amount)),
            account: { order_id: tx.order_id },
            create_time: tx.payload?.time ?? 0,
            perform_time: tx.payload?.perform_time ?? 0,
            cancel_time: tx.payload?.cancel_time ?? 0,
            transaction: tx.id,
            state: stateOf(tx),
            reason: tx.payload?.reason ?? null
          }))
        })
      }
      default:
        return fail(PAYME_ERRORS.method)
    }
  } catch (err) {
    console.error(err)
    return fail(PAYME_ERRORS.perform)
  }
})
