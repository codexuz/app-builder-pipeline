// Click SHOP API callback: prepare (action 0), then complete (action 1).
import { crypto } from 'jsr:@std/crypto@1'
import { encodeHex } from 'jsr:@std/encoding@1/hex'
import { CLICK_ERRORS, clickDecision, type ClickRequest } from '../_shared/protocols.ts'
import { confirmPayment, env, json, orderById } from '../_shared/shop.ts'

const md5 = (text: string) => encodeHex(crypto.subtle.digestSync('MD5', new TextEncoder().encode(text)))

Deno.serve(async (req) => {
  const form = await req.formData()
  const r = Object.fromEntries(form.entries()) as unknown as ClickRequest
  const answer = (key: keyof typeof CLICK_ERRORS, extra: Record<string, unknown> = {}) => json({
    click_trans_id: r.click_trans_id,
    merchant_trans_id: r.merchant_trans_id,
    error: CLICK_ERRORS[key][0],
    error_note: CLICK_ERRORS[key][1],
    ...extra
  })
  try {
    const order = await orderById(r.merchant_trans_id)
    const decision = clickDecision(r, order, env('CLICK_SECRET_KEY'), md5)
    if (decision !== 'ok') return answer(decision)
    // Click reports its own failure on complete with a negative error field.
    if (r.action === '1' && Number(form.get('error') ?? 0) < 0) return answer('cancelled')
    if (r.action === '0') return answer('ok', { merchant_prepare_id: order!.number })
    await confirmPayment(order!.id, 'click', r.click_trans_id, Number(r.amount), r)
    return answer('ok', { merchant_confirm_id: order!.number })
  } catch (err) {
    console.error(err)
    return answer('request')
  }
})
