# App pipeline: instructions for AI agents

This Turborepo turns one product request into a real product with two clients on one backend:

- **web**: Nuxt 4 + Nuxt UI 4, a static SPA deployed to **Vercel**
- **mobile**: Nuxt 4 + **Ionic** (`@nuxtjs/ionic`) inside **Capacitor** for Android and iOS
- **backend**: **Supabase** (Postgres with row-level security, Auth, Storage, Realtime)

Any agent (Claude Code, Codex, Cursor, Gemini, Copilot…) follows this file.

You do not hand-write the predictable 80%. You write a **spec**; the generator derives the database, row-level
security, typed metadata and every CRUD screen in both clients; a verifier proves tenant isolation and permissions in a
real Postgres engine, then Turborepo typechecks and builds both apps. You spend your effort on the domain model and
the features that make the product specific.

## Repository layout

```
packages/pipeline   CLI: spec schema, generators, database verifier
packages/core       Nuxt layer used by web and mobile: Supabase client, auth, workspaces, permissions,
                    records (CRUD + realtime), validation, formatting, route guard, core SQL migration
templates/web       Nuxt UI app copied into each product
templates/mobile    Ionic + Capacitor app copied into each product
specs/examples      crm (team), budget (personal), social (public content)
apps/<slug>/        one product
  app.spec.yaml     the spec (source of truth)
  supabase/         config + migrations (core, generated, yours)
  shared/           GENERATED: schema.ts, icons.json (package @<slug>/shared)
  web/              @<slug>/web
  mobile/           @<slug>/mobile (android/ and ios/ appear after `npx cap add`)
```

## Non-negotiable rules

1. **No mock data, ever.** Screens read and write Supabase. No hardcoded arrays of sample records, fake API
   responses, `setTimeout` "loading" or placeholder charts. Empty states are real empty states.
2. **Never edit generated files**: `shared/*`, `supabase/migrations/20250101000000_core.sql`,
   `supabase/migrations/20250101000100_app_entities.sql`, `web/app/app.config.ts`, `mobile/capacitor.config.ts`,
   `mobile/app/assets/css/theme.css`. Change `app.spec.yaml` and run `npm run generate -- apps/<slug>`.
   Shared behaviour belongs in `packages/core`, not copied into one app.
3. **Every table has RLS.** New tables in custom migrations enable RLS and use `public.has_org_role(org_id, '<role>')`.
   Never disable RLS, never ship the service-role key to a client, never add `using (true)` for writes.
4. **`npm run verify -- apps/<slug>` must pass** before you say the product is done. Report its real output.
5. **Ask before anything outward-facing**: creating a GitHub repo, pushing, `supabase db push`, Vercel deploys,
   store submissions. Prepare the commands; let the user approve them.
6. **Features ship on both clients** unless the user says otherwise: a kanban on web gets a matching mobile screen
   (often a simpler list with an action sheet). Put the data logic in `packages/core` or the database so both share it.

## Stage 1: Spec

Read the request, then decide **tenancy**:

| Request looks like | `app.tenancy` | Entity `visibility` |
|---|---|---|
| A team shares data (CRM, ERP, HR, clinic, inventory, projects, school) | `org` | `org` (default) |
| One person's own data (budget, journal, habits, fitness, notes) | `user` | `org` (= private) |
| Social / community (posts everyone sees, profiles, follows) | `user` | `public` for shared content, `org` for private things |
| Team app with personal items inside (my drafts, private notes) | `org` | `own` on those entities |

Write `specs/<slug>.yaml`, then `npm run validate -- specs/<slug>.yaml` and fix every issue it reports.
If the request is ambiguous on something that changes the data model (who owns data, who may see it), ask at most
three questions; otherwise pick sensible defaults and state them.

Model like a domain expert, not a form builder: real entities, real relations, the enums people actually use
(deal stages, appointment status, invoice states), money as `money`, dates as `date`. 4–12 entities is the sweet spot
for small and mid-size apps. Read `specs/examples/*.yaml` before writing your first spec.

### Spec reference

```yaml
app:
  name: Clinic Desk               # display name
  slug: clinic-desk               # folder and package scope (@clinic-desk/web, @clinic-desk/mobile)
  description: One line shown on sign-in and dashboard
  tenancy: org                    # org | user
  color: teal                     # red orange amber yellow lime green emerald teal cyan sky blue indigo violet purple fuchsia pink rose
  appId: com.clinicdesk.app       # Capacitor bundle id (Android package / iOS bundle)
  currency: USD                   # ISO 4217, used by money fields
  locale: en-US

entities:
  - name: patient                 # snake_case singular; becomes the table name
    label: Patient                # optional (default from name)
    plural: Patients              # optional; also drives the URL (/patients)
    icon: i-lucide-user-round     # any lucide icon: i-lucide-<name> (bundled into both apps)
    title: full_name              # field shown as the record's name (default: first text field)
    description: Optional help text shown above the list
    visibility: org               # org | own | public
    permissions: { read: viewer, create: member, update: member, delete: admin }   # these are the defaults
    own: [update, delete]         # members may only change rows they created; admins change all
    attachments: true             # file uploads on the detail page (Supabase Storage; camera/gallery on phones)
    realtime: true                # live list refresh (default true)
    sort: { field: last_name, dir: asc }   # default: created_at desc
    nav: true                     # show in navigation (false for child-only entities like comments)
    fields:
      - name: full_name           # snake_case; id, org_id, created_by, created_at, updated_at are automatic
        type: text                # see types below
        required: true
        unique: true              # unique within the workspace
        label: Full name
        help: Shown under the input
        default: ...              # booleans true/false, numbers, enum option, date/datetime "now", user "me"
        min: 0                    # numbers: value range; text: max is length
        max: 120
        list: true                # show in lists (default: everything except longtext/json)
        search: true              # included in list search (default: text, email, phone)

dashboard:                        # optional; default is a count tile per entity
  - { type: count, entity: appointment, label: Today, where: { status: [booked, checked_in] }, icon: i-lucide-calendar }
  - { type: sum, entity: invoice, field: total, label: Outstanding, where: { paid: false } }
  - { type: breakdown, entity: appointment, field: status }   # enum/boolean distribution
```

Field types: `text` `longtext` `email` `phone` `url` `integer` `number` `money` `percent` `boolean` `date` `datetime`
`enum` (needs `options`) `tags` `json` `relation` (needs `to: <entity>`, name ends in `_id`; `cascade: true` deletes
children with the parent) `user` (a person in the workspace, name ends in `_id`).

Roles, lowest to highest: `viewer` < `member` < `admin` < `owner`. In `user` tenancy every user owns their own
workspace, so permissions only matter for team apps.

## Stage 2: Generate

```bash
npm install                                   # once, at the repository root
npm run new -- specs/<slug>.yaml              # creates apps/<slug> (web + mobile + shared + supabase) and installs
npm run verify -- apps/<slug>                 # must pass before you continue
```

What both clients get without writing code: sign-up, sign-in and password reset; workspaces with invitations and roles
(team apps) or a private workspace per user (personal apps); a dashboard; lists with search, filters, sorting, paging
and live updates; detail pages with related lists and files; create/edit forms validated by the same schema; settings.
Web adds tables, keyboard search and the activity log; mobile adds pull-to-refresh, infinite scroll, bottom-sheet
pickers, the share sheet for invites and the Android back button.

## Stage 3: Make it specific

| Need | Put it in |
|---|---|
| A custom screen for one entity | `web/app/pages/<plural-slug>/index.vue` and `mobile/app/pages/<plural-slug>/index.vue`. Static routes win over the generic `[entity]` pages. Web: reuse `EntityTable`, `EntityForm`, `EntityValue`. Mobile: reuse `RecordList`, `RecordForm`, `FieldValue`, `RecordPicker`. |
| A new screen | A page in each app; add it to `web/app/layouts/default.vue` and `mobile/app/components/AppMenu.vue` |
| Data logic used by both clients | A composable or util in `packages/core/app` (auto-imported in both apps) |
| Business rules (totals, stock levels, state transitions) | A migration: `apps/<slug>/supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql` with triggers or `security invoker` functions, so web and mobile both obey them |
| A table the spec cannot express | Same migration; `org_id uuid not null references public.organizations(id) on delete cascade`, RLS via `has_org_role`, the `audit_row` trigger |
| Server-only logic (payments, email, third-party APIs with secrets) | A Supabase Edge Function in `apps/<slug>/supabase/functions/<name>`, called with `useSupabase().functions.invoke()` |
| Native features (camera, push, biometrics) | A Capacitor 7 plugin in `mobile/package.json`, wrapped in a composable in `mobile/app/composables` |

Web: Nuxt UI components and semantic colours (`text-muted`, `bg-elevated`); load the `nuxt-ui` skill before complex UI.
Mobile: every page's root is `<ion-page>`; use Ionic components and `var(--ion-color-*)`; navigate with
`useIonRouter()`; refresh data in `onIonViewWillEnter` (Ionic keeps pages alive). Read route params with
`useRouter().currentRoute.value`, not `useRoute()` (it lags one page behind under Ionic's router outlet). The Ionic
module's `useHead` does not unwrap refs: pass plain values and `patch` them.

Run `npm run verify -- apps/<slug>` after each feature.

## Stage 4: Verify

`npm run verify -- apps/<slug>` runs, in order:
1. the spec is valid and generated files are current;
2. every migration (core, generated, yours) applies to Postgres (PGlite, no Docker), then it signs up test users and
   proves per entity: other workspaces cannot read/update/delete/insert, references cannot point into another
   workspace, role permissions match the spec, `created_by` cannot be forged, audit and dashboard work;
3. `turbo run typecheck build` for `@<slug>/web` and `@<slug>/mobile` (unknown components fail the typecheck).

If it fails, fix the cause; never weaken a check or a policy to make it pass.

## Stage 5: Deploy (free tiers; ask the user before running these)

1. **Supabase**: the user creates a free project at supabase.com and gives you the project ref.
   In `apps/<slug>`: `npx supabase login` → `npx supabase link --project-ref <ref>` → `npx supabase db push`, then
   `npm run lock -- apps/<slug>`. In Supabase → Authentication → URL Configuration set the Site URL to the web URL and
   add `<web-url>/**` to the redirect URLs.
2. **Git**: this whole repository is one git repo. `git add -A && git commit` → `gh repo create <name> --private --source . --push`.
3. **Vercel**: import the repo at vercel.com/new, set **Root Directory** to `apps/<slug>/web` (`vercel.json` there
   installs at the repo root and builds with Turborepo), add `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_KEY`.
   Each product is its own Vercel project; pushes only rebuild products that changed.
4. **Mobile**: copy `mobile/.env.example` to `mobile/.env` with the same Supabase values plus `NUXT_PUBLIC_WEB_URL`
   (the Vercel URL, used for email and invite links). Then in `apps/<slug>/mobile`: `npx cap add android` (Android
   Studio required) → `npm run android`. iOS needs a Mac: `npx cap add ios` → `npm run ios`. Commit the generated
   `android/` and `ios/` folders.

Free-tier facts to tell the user: Vercel Hobby is for non-commercial use; Supabase free projects pause after a week
without activity and have a 500 MB database; App Store publishing costs $99/year, Play Store $25 once.
Apps handling health data (HIPAA) or similar regulated data need paid plans with a signed BAA; do not claim compliance.

## Stage 6: Change a deployed product

After `lock`, `generate` no longer rewrites the migrations. For a schema change: update `app.spec.yaml`, write a new
timestamped migration with the matching `alter table` / new table / policies, run `npm run generate -- apps/<slug>`
(refreshes schema and config), then `verify` (it replays every migration and tests the result against the updated
spec), then `npx supabase db push`. Ship a new mobile build for store users; the web app updates on push.
