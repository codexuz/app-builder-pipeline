import { readFileSync } from 'node:fs'

// Icons named in app.spec.yaml (entity and dashboard icons), written by the generator.
const specIcons: string[] = JSON.parse(readFileSync(new URL('../shared/icons.json', import.meta.url), 'utf8'))
// The app's style word: only that stylesheet, and so only its fonts, ship.
const { style } = JSON.parse(readFileSync(new URL('../shared/app.json', import.meta.url), 'utf8')) as { style: string }

// Mobile app: Ionic components in a Capacitor shell for Android and iOS.
// Data, auth and permissions come from @app-pipeline/core, exactly as in the web app.
export default defineNuxtConfig({
  extends: ['@app-pipeline/core'],
  modules: ['@nuxtjs/ionic', '@nuxt/icon', '@nuxt/fonts'],
  devtools: { enabled: false },
  css: ['@ionic/vue/css/palettes/dark.system.css', '~/assets/css/theme.css', '~/assets/css/main.css', `~/assets/styles/${style}.css`],
  compatibilityDate: '2025-07-15',

  app: {
    head: {
      meta: [{ name: 'viewport', content: 'viewport-fit=cover, width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no' }]
    }
  },

  // Capacitor ships this folder inside the app.
  nitro: {
    preset: 'static'
  },

  ionic: {
    integrations: { meta: false },
    css: { utilities: true }
  },

  // Bundled so the native app never needs the network to draw an icon.
  icon: {
    clientBundle: {
      icons: specIcons,
      scan: true
    }
  },

  vite: {
    optimizeDeps: {
      include: ['@capacitor/app', '@capacitor/core', '@capacitor/share']
    }
  }
})
