# App pipeline: instructions for AI agents

This Turborepo turns one request into a real small or medium app: shops, marketplaces, service websites, booking
sites, team tools, personal apps and communities. It is not limited to any field. Each product gets:

- **web**: Nuxt 4 + Nuxt UI 4 on **Vercel**. Public pages render on the server (search engines, link previews); the staff area lives in `/app`
- **mobile**: Nuxt 4 + **Ionic** (`@nuxtjs/ionic`) inside **Capacitor** for Android and iOS
- **backend**: **Supabase** (Postgres with row-level security, Auth, Storage, Realtime)

Any agent (Claude Code, Codex, Cursor, Gemini, Copilot…) follows this file. It is written so a beginner gets a
correct app by answering a few questions, and an advanced user can extend everything without fighting the pipeline.

You do not hand-write the predictable 80%. You write a **spec**; the generator derives the database, security,
checkout, public site, staff area and mobile app from it; a verifier proves the rules in a real Postgres engine for
every kind of person, then Turborepo typechecks and builds both apps. You spend your effort on the domain model and
the features that make the product specific.

## The fixed rules

1. **No mock data, ever.** Screens read and write Supabase. No hardcoded sample records, fake API responses,
   `setTimeout` "loading" or placeholder charts. Empty states are real empty states.
2. **The spec is the source of truth.** Never edit generated files: `shared/*`,
   `supabase/migrations/20250101000000_core.sql`, `supabase/migrations/20250101000100_app_entities.sql`,
   `web/app/app.config.ts`, `mobile/capacitor.config.ts`, `mobile/app/assets/css/theme.css`.
   Change `app.spec.yaml` and run `npm run generate -- apps/<slug>`.
3. **Security is decided by one word.** Each entity has an `access` word; never write your own policies for something
   a word covers. New tables in custom migrations enable RLS and use `public.has_org_role(org_id, '<role>')`.
   Never disable RLS, never ship the service-role key to a client, never add `using (true)` for writes.
4. **Money is computed on the server.** Prices, totals and stock change only inside database functions. Apps send
   what was chosen, never what it costs. Secrets (payment keys) live in Edge Functions.
5. **Public data is really public.** Everything on a `public` entity is readable by anyone. Costs, supplier details
   and notes go in a separate `team` entity linked to it.
6. **`npm run verify -- apps/<slug>` must pass** before you say the product is done. Report its real output. If it
   fails, fix the cause; never weaken a check or a policy.
7. **Ask before anything outward-facing**: creating a repo, pushing, `supabase db push`, deploys, store submissions.
8. **Features ship on both clients** unless the user says otherwise. Put data logic in `packages/core` or the database.

## Stage 1: Spec

Pick the app **type** first, it decides who exists in the app:

| What is being built | `app.type` | Who is in it |
|---|---|---|
| Shop, restaurant, salon, clinic site, school site, any one business with customers | `business` | One business workspace (staff), customers with accounts, anonymous visitors |
| Marketplace (Uzum-style), directory with many providers | `marketplace` | Many seller workspaces, customers, visitors |
| Internal tool: CRM, inventory, projects, HR | `team` | Workspaces with invited staff, nothing public |
| One person's own data, or a community: budget, journal, habits, social | `personal` | Everyone has a private workspace; `members` entities are shared |

Then give every entity one **access** word:

| `access` | Who reads | Who writes | Use it for |
|---|---|---|---|
| `team` (default) | Staff of the workspace | Staff, by role | Internal data: suppliers, costs, tasks |
| `private` | Only the author (and admins) | Only the author (and admins) | Drafts, personal notes |
| `members` | Every signed-in user | The owner's workspace | Community posts, comments, follows |
| `public` | Everyone, even without an account | Staff | Products, services, team pages, articles |
| `customer` | The customer who created it, and staff | Customers create; staff manage | Bookings, requests, returns |
| `inbox` | Staff | Anyone, even without an account | Contact forms, quote requests |

`customer` options: `publicRead: true` lets everyone read it (reviews, testimonials). `customerCan: [update, delete]`
lets customers change their own rows afterwards (the default is create only).

Two field flags protect values: `staff: true` (only staff may set it: status, approval, an answer) and
`readonly: true` (only database functions may set it). Mark every status field `staff: true`.

### Choosing a style

The style sets the whole look, not just colours: fonts, shapes, layout and the home page composition, drawn from craft
local shoppers know. Pick by how the business should feel, and never restyle by hand what a style word covers.

| `style` | For | Look |
|---|---|---|
| `market` | Marketplaces, general stores | Bazaar awnings, dense grid, search first, price first, like Uzum |
| `fashion` | Clothes, shoes, accessories | Adras ikat, huge type, big photographs, sharp edges |
| `fresh` | Flowers, food, bakeries, cosmetics | Rishtan glaze, turquoise and cobalt, round plates |
| `luxury` | Jewellery, watches, premium goods | Lapis and brass, girih stars, very few things on screen, dark |
| `studio` | Salons, clinics, tutors, any service | Suzani medallions, services as a price list, booking first |

Real photographs matter more than anything else on these pages. Tell the owner to upload a square or portrait photo
for each product; the first one becomes the cover.

Write `specs/<slug>.yaml`, then `npm run validate -- specs/<slug>.yaml` and fix every issue it reports; its messages
say how. Ask at most three questions, and only about what changes who owns or sees data; otherwise pick sensible
defaults and state them. Model like a domain expert: real entities, real relations, the enums people actually use.
4–12 entities is the sweet spot. Read `specs/examples/*.yaml` first:

| Example | Shows |
|---|---|
| `flower-shop.yaml` | One shop: catalog, reviews, contact form, checkout questions (delivery date, card message) |
| `marketplace.yaml` | Many sellers, one catalog, carts split per seller, public questions answered by sellers |
| `salon.yaml` | Service website with real time-slot booking: services, specialists, clash-proof bookings |
| `jewellery.yaml` | Luxury shop: ring sizes, private cost records, texts per language |
| `clothing.yaml` | Fashion brand: sizes with their own stock, bold lookbook layout |
| `crm.yaml` | Team tool with roles |
| `budget.yaml` | Personal private data |
| `social.yaml` | Community with shared posts |

### Spec reference

```yaml
app:
  name: Bloom Flowers             # display name
  slug: bloom-flowers             # folder and package scope (@bloom-flowers/web, @bloom-flowers/mobile)
  description: One line shown on the site, sign-in and search results
  type: business                  # team | personal | business | marketplace
  style: fresh                    # market | fashion | fresh | luxury | studio (see "Choosing a style")
  color: rose                     # main button colour: red orange amber yellow lime green emerald teal cyan sky blue indigo violet purple fuchsia pink rose
  appId: uz.bloom.flowers         # Capacitor bundle id
  currency: UZS                   # ISO 4217, used by money fields
  languages: [uz, ru, en]         # the first is the default; the others appear in the language switcher

translations:                     # your own words per language; keys are the English words used in this spec
  uz: { Bouquets: Guldastalar }
  ru: { Bouquets: Букеты }

entities:
  - name: bouquet                 # snake_case singular; becomes the table name
    label: Bouquet                # optional (default from name)
    plural: Bouquets              # optional; also drives the URLs (/bouquets, /app/bouquets)
    icon: i-lucide-flower         # any lucide icon: i-lucide-<name> (bundled into both apps)
    title: name                   # field shown as the record's name (default: first text field)
    description: Optional text shown above the list
    access: public                # see the table above
    permissions: { read: viewer, create: member, update: member, delete: admin }   # staff roles; these are the defaults
    own: [update, delete]         # access team: members only change rows they created
    customerCan: [delete]         # access customer: what customers may do afterwards
    publicRead: true              # access customer: everyone can read it
    attachments: true             # files; public entities get public photos and a cover image
    realtime: true                # live list refresh (default true)
    sort: { field: name, dir: asc }   # default: created_at desc
    nav: true                     # show in menus (false for child-only entities like comments)
    fields:
      - name: price               # snake_case; id, org_id, created_by, created_at, updated_at, cover_url are automatic
        type: money               # see types below
        required: true
        unique: true              # unique within the workspace
        label: Price
        help: Shown under the input
        default: 0                # booleans true/false, numbers, enum option, date/datetime "now", user "me"
        min: 0                    # numbers: value range; text: max is length
        max: 120
        list: true                # show in lists (default: everything except longtext/json)
        search: true              # included in list search (default: text, email, phone)
        translate: true           # text/longtext: adds name_ru, name_en… for staff to fill in per language
        staff: true               # only staff may set it
        readonly: true            # only database functions may set it (needs a default if required)

commerce:                         # adds cart, checkout, orders and stock. Needs type business or marketplace
  product: bouquet                # a public entity whose title is a text field
  price: price                    # required money field
  stock: stock                    # optional; required integer with a default. Reserved at checkout, returned on cancel
  active: available               # optional boolean; false hides it from the shop and blocks ordering
  payments: [cash, click, payme]  # cash | click | payme | stripe. Online ones add Edge Functions (Stage 5)
  variants: true                  # sizes, colours or other options, each with its own stock and optional price
  variantLabel: Size              # what an option is called
  delivery: { fee: 30000, freeFrom: 500000 }
  orderFields:                    # extra checkout questions, stored on the order (same keys as fields)
    - { name: delivery_date, type: date, required: true }

scheduling:                       # time-slot booking; double-booking is impossible, enforced in the database
  entity: booking                 # a customer entity
  start: starts_at                # required datetime field on it
  service: service_id             # required relation to what is booked...
  duration: duration_minutes      # ...and the required integer minutes field on that entity
  length: 60                      # or a fixed length in minutes when there is no service
  resource: specialist_id         # optional relation: who is busy. Empty on a booking means "first free"
  status: status                  # enum field...
  inactive: [cancelled]           # ...and the values that free the slot again
  open: "09:00"
  close: "19:00"
  step: 30                        # minutes between start times
  closedDays: [mon]
  timezone: Asia/Tashkent

site:                             # the public home page. Needs type business or marketplace
  hero: { title: ..., subtitle: ..., cta: { label: Shop now, to: /bouquets } }
  sections:
    - { type: entity, entity: bouquet, title: Popular, limit: 8 }  # public or publicRead entity
    - { type: text, title: About us, body: ... }
    - { type: form, entity: inquiry, title: Write to us, description: ... }  # inbox or customer entity
  contact: { phone: ..., email: ..., address: ..., hours: ..., telegram: ..., instagram: ... }

dashboard:                        # staff dashboard; sensible defaults if omitted
  - { type: count, entity: booking, label: Requests, where: { status: requested }, icon: i-lucide-calendar }
  - { type: sum, entity: shop_order, field: total, label: Revenue, where: { payment_status: paid } }
  - { type: breakdown, entity: shop_order, field: status }   # enum/boolean distribution
```

Field types: `text` `longtext` `email` `phone` `url` `integer` `number` `money` `percent` `boolean` `date` `datetime`
`enum` (needs `options`) `tags` `json` `relation` (needs `to: <entity>`, name ends in `_id`; `cascade: true` deletes
children with the parent) `user` (a person in the workspace, name ends in `_id`).

Roles, lowest to highest: `viewer` < `member` < `admin` < `owner`. The `commerce` block adds the entities `shop_order`
(`/orders`) and `shop_order_item`; use them in `dashboard`. In a marketplace, `customer` and `inbox` entities need a
required relation to a public entity so they reach the right seller.

## Stage 2: Generate

```bash
npm install                                   # once, at the repository root
npm run new -- specs/<slug>.yaml              # creates apps/<slug> (web + mobile + shared + supabase) and installs
npm run verify -- apps/<slug>                 # must pass before you continue
```

| Everyone | Public site and shop (`business`, `marketplace`) | Staff area (`/app`) |
|---|---|---|
| Sign-up, sign-in, password reset | Home page from `site:`, server-rendered catalogs and detail pages with SEO tags | Dashboard, tables with search, filters, sorting and paging |
| Dark mode, responsive layout | Cart, checkout, "your orders", cancel order | Create/edit forms, related lists, files, activity log |
| Android and iOS apps | Public forms, customer records, account page | Invitations, roles, workspace settings |

The first person to open `/app` in a `business` app sets up the business; everyone after that is a customer unless
invited. In a `marketplace`, anyone can open a shop.

```
packages/pipeline   CLI: spec schema, generators, database verifier
packages/core       Nuxt layer used by web and mobile: Supabase client, auth, workspaces, permissions,
                    records, cart, media, validation, route guard, core SQL migration
templates/web       Nuxt UI app copied into each product
templates/mobile    Ionic + Capacitor app copied into each product
specs/examples      six example specs
apps/<slug>/        one product: app.spec.yaml, supabase/, shared/ (generated), web/, mobile/
```

## Stage 3: Make it specific

| Need | Put it in |
|---|---|
| A custom public page for one entity | `web/app/pages/<plural-slug>/index.vue` and `mobile/app/pages/<plural-slug>/index.vue`. Static routes win over the generic `[entity]` pages. Web: reuse `SiteRecordGrid`, `SiteRecordCard`, `SitePublicForm`, `SiteHero`. Mobile: `CatalogGrid`, `PublicForm`. |
| A custom staff page | `web/app/pages/app/<plural-slug>/index.vue`, `mobile/app/pages/app/<plural-slug>/index.vue`. Web: `EntityTable`, `EntityForm`, `EntityValue`. Mobile: `RecordList`, `RecordForm`, `FieldValue`, `RecordPicker`. |
| A new screen | A page in each app; add it to `web/app/layouts/site.vue` or `default.vue`, and `mobile/app/components/AppMenu.vue` |
| Data logic used by both clients | A composable or util in `packages/core/app` (auto-imported in both apps) |
| Business rules (slot conflicts, loyalty points, state transitions) | A migration: `apps/<slug>/supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` with triggers or `security definer` functions, so web and mobile both obey them |
| A table the spec cannot express | Same migration; `org_id uuid not null references public.organizations(id) on delete cascade`, RLS via `has_org_role`, the `audit_row` trigger |
| Server-only logic (online payments, email, third-party APIs with secrets) | A Supabase Edge Function in `apps/<slug>/supabase/functions/<name>`, called with `useSupabase().functions.invoke()` |
| Native features (camera, push, biometrics) | A Capacitor 7 plugin in `mobile/package.json`, wrapped in a composable in `mobile/app/composables` |

Pass components, never name strings, to `<component :is>` (`import { NuxtLink } from '#components'`): a string renders a dead tag that no typecheck or build can catch.

All interface text goes through `t('key')` (`packages/core/app/utils/i18n.ts`, Uzbek, Russian and English side by
side); spec words and labels through `tl('Label')`. Never hardcode a visible string.

Web: Nuxt UI components and semantic colours (`text-muted`, `bg-elevated`); load the `nuxt-ui` skill before complex
UI. Per-style tokens and layout live in `web/app/assets/styles/<style>.css`. Pages outside `/app` use
`definePageMeta({ layout: 'site' })` and `useAsyncData`; add a page that needs the session
to `routeRules` in `nuxt.config.ts`. Set `useSeoMeta` on every public page.
Mobile: every page's root is `<ion-page>`; use Ionic components and `var(--ion-color-*)`; navigate with
`useIonRouter()`; refresh data in `onIonViewWillEnter` (Ionic keeps pages alive). Read route params with
`useRouter().currentRoute.value`, not `useRoute()` (it lags one page behind under Ionic's router outlet). The Ionic
module's `useHead` does not unwrap refs: pass plain values and `patch` them.

Row writes from inside a `security definer` function bypass `staff` and `readonly` field rules on purpose; validate
inputs there. Run `npm run verify -- apps/<slug>` after each feature.

## Stage 4: Verify

`npm run verify -- apps/<slug>` runs, in order:
1. the spec is valid and generated files are current;
2. every migration (core, generated, yours) applies to Postgres (PGlite, no Docker), then it signs up test people and
   proves per entity what visitors, customers, staff roles, other customers and other workspaces can and cannot do,
   that staff-only fields and `created_by` cannot be forged, and that audit and dashboard work. With `commerce` it also
   proves checkout: prices come from the database, stock cannot be oversold, totals cannot be rewritten, cancelling
   returns stock, hidden products cannot be ordered, and marketplace carts split per seller;
   The same run proves options (a product with options needs one, stock is per option), bookings (no double booking,
   no overlaps, opening hours, closed days, cancelling frees the slot), payments (only the service role confirms, the
   amount must match, repeated callbacks count once) and spam limits on public forms;
3. offline checks of the payment protocol rules (Click signatures, Payme amounts, Stripe webhooks);
4. `turbo run typecheck build` for `@<slug>/web` and `@<slug>/mobile` (unknown components fail the typecheck).

## Stage 5: Deploy (free tiers; ask the user before running these)

1. **Supabase**: the user creates a free project at supabase.com and gives you the project ref.
   In `apps/<slug>`: `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`, then
   `npm run lock -- apps/<slug>`. In Supabase → Authentication → URL Configuration set the Site URL to the web URL and
   add `<web-url>/**` to the redirect URLs.
2. **Git**: this whole repository is one git repo. `git add -A && git commit`, then push.
3. **Vercel**: import the repo at vercel.com/new, set **Root Directory** to `apps/<slug>/web` (`vercel.json` there
   installs at the repo root and builds with Turborepo), add `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_KEY`.
   Each product is its own Vercel project.
4. **Online payments** (only if `payments` lists them; ask the user for merchant accounts first): set secrets with
   `npx supabase secrets set NAME=value`: `PUBLIC_SITE_URL` always; `CLICK_SERVICE_ID`, `CLICK_MERCHANT_ID`,
   `CLICK_SECRET_KEY`; `PAYME_MERCHANT_ID`, `PAYME_KEY`; `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SHOP_CURRENCY`.
   Then `npx supabase functions deploy`. In each provider's cabinet set the callback URL to
   `https://<ref>.supabase.co/functions/v1/payment-click` (or `-payme`, `-stripe`). Run a sandbox payment before going live.
5. **Mobile**: copy `mobile/.env.example` to `mobile/.env` with the same Supabase values plus `NUXT_PUBLIC_WEB_URL`
   (the Vercel URL, used for email and invite links). Then in `apps/<slug>/mobile`: `npx cap add android` (Android
   Studio required) → `npm run android`. iOS needs a Mac: `npx cap add ios` → `npm run ios`. Commit the generated
   `android/` and `ios/` folders.

Free-tier facts to tell the user: Vercel Hobby is for non-commercial use, so a real shop needs Vercel Pro or another
host; Supabase free projects pause after a week without activity and have a 500 MB database; App Store publishing
costs $99/year, Play Store $25 once. Apps handling health data or similar regulated data need paid plans and a
compliance review; do not claim compliance.

## Stage 6: Change a deployed product

After `lock`, `generate` no longer rewrites the migrations. For a schema change: update `app.spec.yaml`, write a new
timestamped migration with the matching `alter table` / new table / policies, run `npm run generate -- apps/<slug>`
(refreshes schema and config), then `verify` (it replays every migration and tests the result against the updated
spec), then `npx supabase db push`. Ship a new mobile build for store users; the web app updates on push.

## Not built yet

Tell the user rather than improvising: browser tests of full user journeys, and subscriptions or recurring payments.
Click, Payme and Stripe are built and their protocol rules are tested offline, but each still has to be tried in the
provider's sandbox with real merchant credentials before taking real money.
