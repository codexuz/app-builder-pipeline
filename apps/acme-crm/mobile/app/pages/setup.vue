<template>
  <ion-page>
    <ion-content class="ion-padding">
      <div class="auth-wrap">
        <h1>Connect Supabase</h1>
        <p class="muted">This build has no backend configured. Set these in <code>mobile/.env</code>, then rebuild and run <code>npx cap sync</code>:</p>
        <pre style="white-space: pre-wrap; font-size: 12px">NUXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NUXT_PUBLIC_SUPABASE_KEY=your-anon-or-publishable-key</pre>
      </div>
    </ion-content>
  </ion-page>
</template>
