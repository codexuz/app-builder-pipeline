# App pipeline

Turn one request into a real small or medium app: an online shop, a marketplace, a service website, a booking site,
a team tool, a personal app or a community. Any field. Each product gets a **Nuxt UI** web app on **Vercel**, an
**Ionic + Capacitor** app for Android and iOS, and a **Supabase** backend shared by both. No mock data.

```bash
npm install
# With Claude Code:
/build-app A flower shop in Tashkent with same-day delivery
# Or by hand, or with any other AI agent (they read AGENTS.md):
npm run new -- specs/examples/flower-shop.yaml
npm run verify -- apps/bloom-flowers
```

## Why it stays correct

You describe the app in a short YAML spec, using a few fixed words, and the pipeline does the rest.

**One `type` for the app:** `business` (one shop or company), `marketplace` (many sellers), `team` (internal tool),
`personal` (private data or a community).

**One `access` word for each kind of data:**

| Word | Example | Meaning |
|---|---|---|
| `public` | Products, services | Anyone can read, staff edit |
| `customer` | Bookings, reviews | Customers create theirs and see only theirs, staff manage |
| `inbox` | Contact form | Anyone can send, only staff read |
| `team` | Suppliers, costs | Staff only |
| `private` | Drafts | Only the author |
| `members` | Community posts | Every signed-in user |

The generator turns those words into database security rules, and the verifier proves them by acting as a visitor,
customer, staff member and rival seller against a real Postgres engine. Beginners only choose words. Advanced users
add custom pages, migrations and Edge Functions wherever the spec stops; see [AGENTS.md](AGENTS.md) stage 3.

```
request ──► app.spec.yaml ──► generator ──► SQL + security + checkout + schema ──► web + mobile
   (AI)      (AI, validated)   (fixed code)                                        + custom features (AI)
                                     │
              verify: real Postgres proves the rules for every kind of person,
              then turbo typecheck + build for both apps
```

## Five looks, one word

`app.style` gives each business its own identity, drawn from craft shoppers in Uzbekistan know by heart:
`market` (bazaar awnings, dense like Uzum), `fashion` (adras ikat, huge type), `fresh` (Rishtan glaze, round plates),
`luxury` (lapis, brass, girih stars) and `studio` (suzani medallions, services as a price list). Screens come in Uzbek,
Russian and English.

## Layout

```
packages/pipeline   CLI (spec, generators, verifier)
packages/core       Nuxt layer shared by web and mobile (Supabase, auth, records, cart, validation)
templates/web       Nuxt UI app template (public site, shop, staff area in /app)
templates/mobile    Ionic + Capacitor app template
specs/examples      flower shop, marketplace, salon, jewellery, clothing, CRM, budget, community
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

- **Payments:** cash, Click, Payme and Stripe are built. The protocol rules are tested offline, but try each provider's sandbox with real merchant credentials before taking real money.
- **Photos:** the styles are built around real product photographs, so a shop without them will look unfinished.
- **Hosting:** Vercel Hobby is non-commercial, so a shop that earns money needs a paid plan or another host. Supabase free projects pause after 7 idle days (500 MB database).
- **Mobile:** iOS builds need a Mac; store accounts cost money (Apple $99/yr, Google $25 once). `@nuxtjs/ionic` 1.0 pins Ionic 8 and Capacitor 7.
- **Regulated data** (health records, card data) needs paid plans and a compliance review. The pipeline does not make an app compliant.
