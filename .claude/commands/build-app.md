---
description: Build a complete app from one product request (spec → generate → custom features → verify)
argument-hint: <what the app should do>
---

Build this app end to end by following AGENTS.md exactly: $ARGUMENTS

1. **Spec.** Choose tenancy (team, personal or social) and model the domain like an expert in it. Read
   `specs/examples/*.yaml` first. Write `specs/<slug>.yaml` and run `npm run validate -- specs/<slug>.yaml` until it is
   clean. Show the user a short summary (entities, who sees what, dashboard) and the assumptions you made. Continue
   unless a choice changes who owns or can see data and you could not infer it; then ask (at most three questions).
2. **Generate.** `npm run new -- specs/<slug>.yaml`, then `npm run verify -- apps/<slug>`. Fix the spec, not the
   generated files, if anything fails.
3. **Make it specific.** List the 2–5 features that make this product more than CRUD (calendar, kanban, feed,
   totals, approvals, documents…). Build each one following the "Make it specific" table in AGENTS.md: business rules
   as migrations, shared logic in `packages/core`, screens in both the web app (Nuxt UI; load the `nuxt-ui` skill)
   and the mobile app (Ionic), real Supabase data only. Run `verify` after each.
4. **Report.** Final `verify` output, what was built, what is generic vs custom, and the exact deploy steps from
   AGENTS.md stage 5. Do not deploy, push or create repositories without the user's go-ahead.
