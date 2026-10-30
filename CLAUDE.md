@AGENTS.md

## Claude Code specifics

- `/build-app <request>` runs the whole pipeline for one product request; `/deploy-app <slug>` walks through deployment.
- Load the `nuxt-ui` skill before writing custom web UI. Mobile screens use Ionic components (see AGENTS.md stage 3).
- Use the browser pane to check screens against a real Supabase project once `.env` is set: `npx turbo run dev --filter=@<slug>/web` (port 3000) or `@<slug>/mobile` (port 3100, use the mobile viewport).
