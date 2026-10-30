import { readFileSync } from 'node:fs'

// Icons named in app.spec.yaml (entity and dashboard icons), written by the generator.
const specIcons: string[] = JSON.parse(readFileSync(new URL('../shared/icons.json', import.meta.url), 'utf8'))

// Web app: Nuxt UI dashboard, deployed to Vercel. Data, auth and permissions come from @app-pipeline/core.
export default defineNuxtConfig({
  extends: ['@app-pipeline/core'],
  modules: ['@nuxt/ui'],
  devtools: { enabled: false },
  css: ['~/assets/css/main.css'],
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
