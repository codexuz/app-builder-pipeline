---
description: Deploy a generated app to Supabase, GitHub and Vercel (asks before each outward step)
argument-hint: <app slug>
---

Deploy `apps/$ARGUMENTS` (web to Vercel, mobile via Capacitor) following AGENTS.md stage 5.

1. Run `npm run verify -- apps/$ARGUMENTS`; stop if it fails.
2. Ask the user for their Supabase project ref and anon key (they create a free project at supabase.com). Write them
   to `apps/$ARGUMENTS/web/.env` and `apps/$ARGUMENTS/mobile/.env` (never commit them).
3. Show the user each command below and run it only after they approve:
   - in `apps/$ARGUMENTS`: `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`,
     then at the root `npm run lock -- apps/$ARGUMENTS`
   - at the root (one repo for all products): `git add -A`, `git commit`, `gh repo create <name> --private --source . --push`
4. Tell the user the remaining dashboard steps: import the repo at vercel.com/new with Root Directory
   `apps/$ARGUMENTS/web` and the two `NUXT_PUBLIC_SUPABASE_*` variables; in Supabase set Authentication → URL
   Configuration to the Vercel URL.
5. Mobile: add `NUXT_PUBLIC_WEB_URL=<vercel url>` to `mobile/.env`, then in `apps/$ARGUMENTS/mobile`
   `npx cap add android` and `npm run android` (Android Studio needed); iOS needs a Mac (`npx cap add ios`, `npm run ios`).
6. Online payments: only with the user's merchant accounts. Follow AGENTS.md stage 5, step 4, and run a sandbox payment
   before going live.
