// Offline checks of the payment protocol rules. Provider sandboxes still have to be tried with real credentials.
import { createHash } from 'node:crypto'
import {
  clickDecision, clickPayUrl, clickSignature, fromStripeAmount, paymeAuthorized, paymePayUrl, parseStripeSignature,
  stripeAmount, stripeFresh, toTiyin, type ClickRequest
} from '../../core/functions/_shared/protocols.ts'
import type { CheckResult } from './db.ts'

const md5 = (s: string) => createHash('md5').update(s).digest('hex')
const b64 = (s: string) => Buffer.from(s).toString('base64')

export function verifyPayments(methods: string[]): CheckResult[] {
  const results: CheckResult[] = []
  const check = (name: string, ok: boolean) => results.push({ name, ok, detail: ok ? undefined : 'protocol rule broken' })

  if (methods.includes('click')) {
    const base: ClickRequest = { click_trans_id: '1', service_id: '2', merchant_trans_id: 'order', amount: '1000.00', action: '0', sign_time: '2026-01-01 10:00:00', sign_string: '' }
    const signed = (r: ClickRequest, secret = 'secret') => ({ ...r, sign_string: clickSignature(r, secret, md5) })
    const order = { total: 1000, status: 'new', payment_status: 'unpaid' }
    check('click: the signature follows the documented field order', clickSignature(base, 's', md5) === md5(`12sorder1000.000${base.sign_time}`))
    check('click: complete signs the prepare id', clickSignature({ ...base, action: '1', merchant_prepare_id: '9' }, 's', md5) === md5(`12sorder91000.001${base.sign_time}`))
    check('click: a valid prepare is accepted', clickDecision(signed(base), order, 'secret', md5) === 'ok')
    check('click: a forged signature is refused', clickDecision(signed(base, 'wrong'), order, 'secret', md5) === 'signature')
    check('click: the wrong amount is refused', clickDecision(signed({ ...base, amount: '1.00' }), order, 'secret', md5) === 'amount')
    check('click: a paid order is refused', clickDecision(signed(base), { ...order, payment_status: 'paid' }, 'secret', md5) === 'alreadyPaid')
    check('click: a cancelled order is refused', clickDecision(signed(base), { ...order, status: 'cancelled' }, 'secret', md5) === 'cancelled')
    check('click: an unknown order is refused', clickDecision(signed(base), null, 'secret', md5) === 'notFound')
    check('click: the pay link carries the order', clickPayUrl({ serviceId: '1', merchantId: '2', amount: 5000, orderId: 'abc', returnUrl: 'https://x.uz/o' }).includes('transaction_param=abc'))
  }
  if (methods.includes('payme')) {
    check('payme: amounts are in tiyin', toTiyin(1234.56) === 123456)
    const url = paymePayUrl({ merchantId: 'm1', amount: 100, orderId: 'o1', returnUrl: 'https://x.uz' }, b64)
    check('payme: the pay link encodes merchant, order and amount', Buffer.from(url.split('/').pop()!, 'base64').toString() === 'm=m1;ac.order_id=o1;a=10000;c=https://x.uz')
    check('payme: only the merchant key is authorized', paymeAuthorized(`Basic ${b64('Paycom:key')}`, 'key', b64) && !paymeAuthorized(`Basic ${b64('Paycom:bad')}`, 'key', b64) && !paymeAuthorized(null, 'key', b64))
  }
  if (methods.includes('stripe')) {
    check('stripe: amounts use the minor unit', stripeAmount(12.5, 'usd') === 1250 && stripeAmount(500, 'jpy') === 500)
    check('stripe: amounts convert back', fromStripeAmount(1250, 'usd') === 12.5)
    const parsed = parseStripeSignature('t=100,v1=abc,v0=old')
    check('stripe: the signature header is parsed', parsed.timestamp === '100' && parsed.signature === 'abc')
    check('stripe: old webhooks are refused', stripeFresh('1000', 1100) && !stripeFresh('1000', 2000))
  }
  return results
}
