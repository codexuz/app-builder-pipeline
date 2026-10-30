import { app, commerce } from '#core/schema'
import { entityByName, recordTitle, type Row } from '#core/utils/meta'

interface CartLine { id: string, qty: number, variant?: string }
export interface CartItem { key: string, id: string, variant?: string, variantName?: string, qty: number, title: string, price: number, stock?: number, cover?: string | null, seller?: string, product: Row }

const STORAGE_KEY = () => `${app.slug}:cart`

// The cart lives on the device. Prices shown here are for display only:
// checkout (place_order) recalculates everything from the database.
export function useCart() {
  const lines = useState<CartLine[]>('cart:lines', () => [])
  const restored = useState('cart:restored', () => false)

  if (import.meta.client && !restored.value) {
    restored.value = true
    try { lines.value = JSON.parse(localStorage.getItem(STORAGE_KEY()) ?? '[]') } catch { lines.value = [] }
  }
  const persist = () => { if (import.meta.client) localStorage.setItem(STORAGE_KEY(), JSON.stringify(lines.value)) }

  const count = computed(() => lines.value.reduce((n, l) => n + l.qty, 0))

  const keyOf = (l: { id: string, variant?: string }) => `${l.id}:${l.variant ?? ''}`
  function add(id: string, qty = 1, variant?: string) {
    const line = lines.value.find(l => keyOf(l) === keyOf({ id, variant }))
    if (line) line.qty = Math.min(999, line.qty + qty)
    else lines.value.push({ id, qty, variant })
    persist()
  }
  function setQty(key: string, qty: number) {
    if (qty < 1) return remove(key)
    const line = lines.value.find(l => keyOf(l) === key)
    if (line) line.qty = Math.min(999, Math.floor(qty))
    persist()
  }
  function remove(key: string) {
    lines.value = lines.value.filter(l => keyOf(l) !== key)
    persist()
  }
  function clear() {
    lines.value = []
    persist()
  }

  // Current product data for the lines in the cart; products that disappeared are dropped.
  async function items(): Promise<CartItem[]> {
    const shop = commerce
    if (!shop || !lines.value.length) return []
    const product = entityByName(shop.product)!
    const options = shop.variants ? ', variants:shop_variant(id, name, price, stock, active)' : ''
    let q = useSupabase().from(product.name).select(`*, seller:organizations(name)${options}`).in('id', lines.value.map(l => l.id))
    if (shop.active) q = q.eq(shop.active, true)
    const { data, error } = await q
    if (error) throw error
    const rows = (data ?? []) as unknown as Row[]
    const found = new Set(rows.map(r => r.id))
    const optionOf = (l: CartLine) => (rows.find(r => r.id === l.id)?.variants as Row[] | undefined)?.find(v => v.id === l.variant)
    const usable = (l: CartLine) => found.has(l.id) && (!l.variant || Boolean(optionOf(l)?.active))
    if (lines.value.some(l => !usable(l))) {
      lines.value = lines.value.filter(usable)
      persist()
    }
    return lines.value.map((l) => {
      const row = rows.find(r => r.id === l.id)!
      const option = optionOf(l)
      return {
        key: keyOf(l),
        id: l.id,
        variant: l.variant,
        variantName: option?.name,
        qty: l.qty,
        title: recordTitle(product, row),
        price: Number(option?.price ?? row[shop.price]),
        stock: !shop.stock ? undefined : Number(option ? option.stock : row[shop.stock]),
        cover: row.cover_url,
        seller: row.seller?.name,
        product: row
      }
    })
  }

  // Same rule as place_order: each seller's order has its own fee and free-delivery threshold.
  function deliveryFee(items: CartItem[]) {
    if (!commerce) return 0
    const { fee, freeFrom } = commerce.delivery
    const perSeller = new Map<string, number>()
    for (const i of items) perSeller.set(i.product.org_id, (perSeller.get(i.product.org_id) ?? 0) + i.price * i.qty)
    return [...perSeller.values()].reduce((sum, sub) => sum + (freeFrom !== undefined && sub >= freeFrom ? 0 : fee), 0)
  }

  // Returns the new order ids (one per seller in a marketplace).
  async function checkout(details: Record<string, unknown>): Promise<string[]> {
    const { data, error } = await useSupabase().rpc('place_order', {
      p_items: lines.value.map(l => ({ product_id: l.id, quantity: l.qty, ...(l.variant ? { variant_id: l.variant } : {}) })),
      p_details: details
    })
    if (error) throw error
    clear()
    return data as string[]
  }

  return { lines, count, add, setQty, remove, clear, items, deliveryFee, checkout }
}
