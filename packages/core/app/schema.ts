// Typed view of the product's generated schema (apps/<slug>/shared/schema.ts).
import * as generated from '#schema'
import type { AppMeta, CardMeta, EntityMeta } from './utils/meta'

export const app = generated.app as unknown as AppMeta
export const entities = generated.entities as unknown as EntityMeta[]
export const dashboard = generated.dashboard as unknown as CardMeta[]
