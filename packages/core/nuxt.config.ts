import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Shared by the web (Nuxt UI) and mobile (Ionic) apps of every product.
// Both are static single-page builds that talk to Supabase directly, protected by row level security.
export default defineNuxtConfig({
  ssr: false,

  // Set via NUXT_PUBLIC_SUPABASE_URL and NUXT_PUBLIC_SUPABASE_KEY (the anon/publishable key) at build time.
  runtimeConfig: {
    public: {
      supabaseUrl: '',
      supabaseKey: '',
      // NUXT_PUBLIC_WEB_URL: the deployed web app. Email and invite links point here, because the
      // native apps run on capacitor://localhost, which a browser cannot open.
      webUrl: ''
    }
  },

  alias: {
    '#core': fileURLToPath(new URL('./app', import.meta.url))
  },

  modules: [
    // Each product keeps its generated schema in apps/<slug>/shared, next to its web and mobile apps.
    (_options, nuxt) => {
      nuxt.options.alias['#schema'] = resolve(nuxt.options.rootDir, '../shared/schema.ts')
    }
  ],

  // Plain static output in .output/public, used by Vercel and Capacitor alike.
  nitro: {
    preset: 'static'
  },

  vite: {
    optimizeDeps: {
      include: ['@supabase/supabase-js', 'zod']
    }
  },

  // Unknown tags (e.g. a misnamed component) fail `nuxt typecheck` instead of rendering nothing.
  typescript: {
    tsConfig: {
      vueCompilerOptions: { checkUnknownComponents: true }
    }
  }
})
