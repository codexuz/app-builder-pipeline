# App pipeline

A Turborepo that turns one request into a real product: a **Nuxt UI** web app on **Vercel**, an **Ionic +
Capacitor** app for Android and iOS, and a **Supabase** backend shared by both. It works for team apps (CRM, ERP,
clinic, inventory), personal apps (budget, journal, habits) and social apps (posts, comments, follows).

```bash
npm install
# With Claude Code:
/build-app A clinic app with patients, appointments, staff roles and invoices
# Or by hand / with any other AI agent (they read AGENTS.md):
npm run new -- specs/examples/crm.yaml
npm run verify -- apps/acme-crm
```

## How it works

```
request ──► app.spec.yaml ──► generator ──► SQL + RLS + schema ──► web (Nuxt UI) + mobile (Ionic)
   (AI)      (AI, validated)   (deterministic)                        generic screens + custom features (AI)
                                                    │
                     verify: real Postgres (PGlite) proves tenant isolation and permissions per entity,
                     then turbo typecheck + build for both apps
```

```
packages/pipeline   CLI (spec, generators, verifier)
packages/core       Nuxt layer shared by web and mobile (Supabase, auth, workspaces, records, validation)
templates/web       Nuxt UI app template
templates/mobile    Ionic + Capacitor app template
specs/examples      team CRM, personal budget, social community
apps/<slug>/        a product: app.spec.yaml, supabase/, shared/, web/, mobile/
```

## Commands (from the repository root)

| | |
|---|---|
| `npm run validate -- <spec>` | Check a spec and show what it describes |
| `npm run new -- <spec>` | Create `apps/<slug>` and install |
| `npm run generate -- apps/<slug>` | Regenerate after editing `app.spec.yaml` |
| `npm run verify -- apps/<slug>` | Spec, generated files, database security tests, typecheck and build of web + mobile |
| `npm run lock -- apps/<slug>` | After the first `supabase db push`: schema changes become new migrations |
| `npm test` | Database checks for all example specs |
| `npx turbo run dev --filter=@<slug>/web` | Web dev server on :3000 (mobile: `@<slug>/mobile`, :3100) |

## Limits to know

- Free tiers: Vercel Hobby is non-commercial; Supabase free projects pause after 7 idle days (500 MB DB).
- iOS builds need a Mac; store accounts cost money (Apple $99/yr, Google $25 once).
- The mobile app uses `@nuxtjs/ionic` 1.0, which pins Ionic 8 and Capacitor 7 (both supported releases).
- Regulated data (HIPAA health records, payments) needs paid plans and a compliance review. The pipeline does not make an app compliant.
- The generator covers data, permissions and CRUD screens. Product-specific screens and rules (a calendar, a kanban, stock
  movements) are written per product by the agent, following AGENTS.md stage 3.
