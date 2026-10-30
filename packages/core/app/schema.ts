// Typed view of the product's generated schema (apps/<slug>/shared/schema.ts).
import * as generated from '#schema'
import type { AppMeta, CardMeta, CommerceMeta, EntityMeta, SchedulingMeta, SiteMeta } from './utils/meta'

export const app = generated.app as unknown as AppMeta
export const entities = generated.entities as unknown as EntityMeta[]
export const dashboard = generated.dashboard as unknown as CardMeta[]
export const commerce = generated.commerce as unknown as CommerceMeta | null
export const site = generated.site as unknown as SiteMeta | null
export const scheduling = generated.scheduling as unknown as SchedulingMeta | null
export const translations = generated.translations as unknown as Record<string, Record<string, string>>
