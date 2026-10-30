// Provider protocol rules as plain functions, so they run under Deno in Edge Functions and under Node in `verify`.

export type Md5 = (text: string) => string

export interface ClickRequest {
  click_trans_id: string
  service_id: string
  merchant_trans_id: string
  merchant_prepare_id?: string
  amount: string
  action: string
  sign_time: string
  sign_string: string
}

// Click SHOP API: prepare (action 0) and complete (action 1) sign different fields.
export function clickSignature(r: ClickRequest, secret: string, md5: Md5): string {
  const prepared = r.action === '1' ? (r.merchant_prepare_id ?? '') : ''
  return md5(`${r.click_trans_id}${r.service_id}${secret}${r.merchant_trans_id}${prepared}${r.amount}${r.action}${r.sign_time}`)
}

export const CLICK_ERRORS = {
  ok: [0, 'Success'],
  signature: [-1, 'SIGN CHECK FAILED'],
  amount: [-2, 'Incorrect parameter amount'],
  action: [-3, 'Action not found'],
  alreadyPaid: [-4, 'Already paid'],
  notFound: [-5, 'Order does not exist'],
  transaction: [-6, 'Transaction does not exist'],
  request: [-8, 'Error in request from click'],
  cancelled: [-9, 'Transaction cancelled']
} as const

// Decides a Click callback from the order's state; returns which error to answer with.
export function clickDecision(
  r: ClickRequest,
  order: { total: number, status: string, payment_status: string } | null,
  secret: string,
  md5: Md5
): keyof typeof CLICK_ERRORS {
  if (clickSignature(r, secret, md5) !== r.sign_string) return 'signature'
  if (r.action !== '0' && r.action !== '1') return 'action'
  if (!order) return 'notFound'
  if (order.status === 'cancelled') return 'cancelled'
  if (order.payment_status === 'paid') return 'alreadyPaid'
  if (Number(r.amount) !== order.total) return 'amount'
  return 'ok'
}

export const clickPayUrl = (o: { serviceId: string, merchantId: string, amount: number, orderId: string, returnUrl: string }) =>
  `https://my.click.uz/services/pay?${new URLSearchParams({
    service_id: o.serviceId,
    merchant_id: o.merchantId,
    amount: o.amount.toFixed(2),
    transaction_param: o.orderId,
    return_url: o.returnUrl
  })}`

// Payme counts in tiyin (1/100 so'm).
export const toTiyin = (amount: number) => Math.round(amount * 100)

export function paymePayUrl(o: { merchantId: string, amount: number, orderId: string, returnUrl: string }, base64: (s: string) => string) {
  const params = `m=${o.merchantId};ac.order_id=${o.orderId};a=${toTiyin(o.amount)};c=${o.returnUrl}`
  return `https://checkout.paycom.uz/${base64(params)}`
}

export const paymeAuthorized = (header: string | null, key: string, base64: (s: string) => string) =>
  header === `Basic ${base64(`Paycom:${key}`)}`

export const PAYME_ERRORS = {
  auth: { code: -32504, message: { uz: 'Ruxsat yoʻq', ru: 'Недостаточно привилегий', en: 'Insufficient privileges' } },
  method: { code: -32601, message: { uz: 'Metod topilmadi', ru: 'Метод не найден', en: 'Method not found' } },
  amount: { code: -31001, message: { uz: 'Notoʻgʻri summa', ru: 'Неверная сумма', en: 'Wrong amount' } },
  transaction: { code: -31003, message: { uz: 'Tranzaksiya topilmadi', ru: 'Транзакция не найдена', en: 'Transaction not found' } },
  perform: { code: -31008, message: { uz: 'Bajarib boʻlmaydi', ru: 'Невозможно выполнить', en: 'Cannot perform' } },
  order: { code: -31050, message: { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' }, data: 'order_id' },
  busy: { code: -31099, message: { uz: 'Buyurtma toʻlov jarayonida', ru: 'Заказ ожидает оплаты', en: 'Order is awaiting payment' }, data: 'order_id' }
} as const

// Stripe keeps most currencies in 1/100 units; these have no minor unit.
const ZERO_DECIMAL = new Set(['bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf', 'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf'])
export const stripeAmount = (amount: number, currency: string) =>
  ZERO_DECIMAL.has(currency.toLowerCase()) ? Math.round(amount) : Math.round(amount * 100)
export const fromStripeAmount = (amount: number, currency: string) =>
  ZERO_DECIMAL.has(currency.toLowerCase()) ? amount : amount / 100

export function parseStripeSignature(header: string | null) {
  const parts = Object.fromEntries((header ?? '').split(',').map((p) => {
    const i = p.indexOf('=')
    return [p.slice(0, i), p.slice(i + 1)]
  }))
  return { timestamp: parts.t as string | undefined, signature: parts.v1 as string | undefined }
}

// Rejects replays: Stripe's default tolerance is five minutes.
export const stripeFresh = (timestamp: string, nowSeconds: number, tolerance = 300) =>
  Math.abs(nowSeconds - Number(timestamp)) <= tolerance
