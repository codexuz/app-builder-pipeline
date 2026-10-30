import { scheduling } from '#core/schema'

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const pad = (n: number) => String(n).padStart(2, '0')
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Days and free starting times from the database, which also refuses clashes on save.
export function useBooking() {
  // The next two weeks, with closed days marked rather than hidden.
  function upcomingDays(count = 14) {
    return Array.from({ length: count }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return { iso: isoDay(d), date: d, closed: (scheduling?.closedDays as string[] ?? []).includes(DAYS[d.getDay()]!) }
    })
  }

  async function freeSlots(org: string, day: string, service?: string | null, resource?: string | null): Promise<string[]> {
    if (!scheduling) return []
    const args: Record<string, unknown> = { p_org: org, p_day: day }
    if (scheduling.service) args.p_service = service
    if (scheduling.resource && resource) args.p_resource = resource
    const { data, error } = await useSupabase().rpc('free_slots', args)
    if (error) throw error
    return (data ?? []) as string[]
  }

  // Slot times shown in the business's own timezone, wherever the customer is.
  const slotLabel = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: scheduling?.timezone
  })

  return { upcomingDays, freeSlots, slotLabel }
}
