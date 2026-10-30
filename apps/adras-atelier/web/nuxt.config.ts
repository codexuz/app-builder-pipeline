import { readFileSync } from 'node:fs'

// Icons named in app.spec.yaml (entity and dashboard icons), written by the generator.
const specIcons: string[] = JSON.parse(readFileSync(new URL('../shared/icons.json', import.meta.url), 'utf8'))
// The app's style word: only that stylesheet, and so only its fonts, ship.
const { style } = JSON.parse(readFileSync(new URL('../shared/app.json', import.meta.url), 'utf8')) as { style: string }

// Web app: public site and shop rendered on the server (search engines, link previews) plus the staff area in /app.
// Deployed to Vercel. Data, auth and permissions come from @app-pipeline/core.
export default defineNuxtConfig({
  extends: ['@app-pipeline/core'],
  modules: ['@nuxt/ui'],
  ssr: true,

  // Sessions live in the browser, so anything that depends on who is signed in renders there.
  routeRules: {
    '/app/**': { ssr: false },
    '/login': { ssr: false },
    '/forgot-password': { ssr: false },
    '/reset-password': { ssr: false },
    '/setup': { ssr: false },
    '/invite/**': { ssr: false },
    '/cart': { ssr: false },
    '/checkout': { ssr: false },
    '/account': { ssr: false }
  },

  devtools: { enabled: false },
  css: ['~/assets/css/main.css', `~/assets/styles/${style}.css`],
  compatibilityDate: '2025-07-15',

  app: {
    head: {
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }]
    }
  },

  // Bundle every icon so pages never wait on the icon API.
  icon: {
    clientBundle: {
      icons: specIcons,
      scan: true
    }
  }
})
