<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Setup required' })
</script>

<template>
  <div class="space-y-4 text-sm">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-plug-zap" class="size-5 text-warning" />
      <h1 class="text-lg font-semibold text-highlighted">Connect Supabase</h1>
    </div>
    <p class="text-muted">This build has no backend configured. Set these variables, then rebuild:</p>
    <pre class="overflow-x-auto rounded-md bg-elevated p-3 text-xs">NUXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=your-anon-or-publishable-key</pre>
    <p class="text-muted">Locally put them in <code>.env</code>. On Vercel add them under Project → Settings → Environment Variables.</p>
  </div>
</template>
