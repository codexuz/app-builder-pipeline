import { app, commerce } from '#core/schema'
import { entityByName, recordTitle, type Row } from '#core/utils/meta'

interface CartLine { id: string, qty: number }
export interface CartItem { id: string, qty: number, title: string, price: number, stock?: number, cover?: string | null, seller?: string, product: Row }

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

  function add(id: string, qty = 1) {
    const line = lines.value.find(l => l.id === id)
    if (line) line.qty = Math.min(999, line.qty + qty)
    else lines.value.push({ id, qty })
    persist()
  }
  function setQty(id: string, qty: number) {
    if (qty < 1) return remove(id)
    const line = lines.value.find(l => l.id === id)
    if (line) line.qty = Math.min(999, Math.floor(qty))
    persist()
  }
  function remove(id: string) {
    lines.value = lines.value.filter(l => l.id !== id)
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
    let q = useSupabase().from(product.name).select('*, seller:organizations(name)').in('id', lines.value.map(l => l.id))
    if (shop.active) q = q.eq(shop.active, true)
    const { data, error } = await q
    if (error) throw error
    const rows = (data ?? []) as unknown as Row[]
    const found = new Set(rows.map(r => r.id))
    if (lines.value.some(l => !found.has(l.id))) {
      lines.value = lines.value.filter(l => found.has(l.id))
      persist()
    }
    return lines.value.map((l) => {
      const row = rows.find(r => r.id === l.id)!
      return {
        id: l.id,
        qty: l.qty,
        title: recordTitle(product, row),
        price: Number(row[shop.price]),
        stock: shop.stock ? Number(row[shop.stock]) : undefined,
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
      p_items: lines.value.map(l => ({ product_id: l.id, quantity: l.qty })),
      p_details: details
    })
    if (error) throw error
    clear()
    return data as string[]
  }

  return { lines, count, add, setQty, remove, clear, items, deliveryFee, checkout }
}
