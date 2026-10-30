import { app } from '#core/schema'

// Where customer records and messages go: the one business workspace, or (marketplace) the seller
// of the product they are about. Resolved once and cached.
export function useShop() {
  const businessOrg = useState<string | null | undefined>('shop:business-org', () => undefined)

  async function loadBusinessOrg(): Promise<string | null> {
    if (businessOrg.value !== undefined) return businessOrg.value
    const { data, error } = await useSupabase().rpc('business_org')
    if (error) throw error
    businessOrg.value = (data as string | null) ?? null
    return businessOrg.value
  }

  // For a record about something (a review of a product), use that thing's workspace; otherwise the business.
  async function targetOrg(relatedOrg?: string | null): Promise<string> {
    if (relatedOrg) return relatedOrg
    if (app.type === 'business') {
      const id = await loadBusinessOrg()
      if (id) return id
      throw new Error('The shop is not set up yet')
    }
    throw new Error('Choose what this is about first')
  }

  return { businessOrg, loadBusinessOrg, targetOrg }
}
