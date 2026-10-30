<script setup lang="ts">
import * as z from 'zod'

definePageMeta({ layout: 'auth' })
useHead({ title: () => t('auth.signIn') })

const route = useRoute()
const { signIn, signUp } = useAuth()
const toast = useToast()

const mode = ref<'signin' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'signin')
const loading = ref(false)
const confirmSent = ref('')
const state = reactive({ name: '', email: typeof route.query.email === 'string' ? route.query.email : '', password: '' })

const schema = computed(() => z.object({
  name: mode.value === 'signup' ? z.string().trim().min(1, t('v.name')) : z.string().optional(),
  email: z.email(t('v.email')),
  password: mode.value === 'signup' ? z.string().min(8, t('v.password')) : z.string().min(1, t('v.required', { label: t('auth.password') }))
}))

const redirect = computed(() => safeRedirect(route.query.redirect))

async function onSubmit() {
  loading.value = true
  try {
    if (mode.value === 'signin') {
      await signIn(state.email, state.password)
      await navigateTo(redirect.value)
    } else {
      const needsConfirm = await signUp(state.email, state.password, state.name.trim())
      if (needsConfirm) confirmSent.value = state.email
      else await navigateTo(redirect.value)
    }
  } catch (err: any) {
    toast.add({ title: t('form.failed'), description: err?.message ?? String(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="confirmSent" class="space-y-3 text-center">
    <UIcon name="i-lucide-mail-check" class="mx-auto size-10 text-primary" />
    <h1 class="site-title text-xl">{{ t('auth.checkEmail') }}</h1>
    <p class="text-sm text-muted">{{ t('auth.checkEmailNote', { email: confirmSent }) }}</p>
    <UButton :label="t('auth.backToSignIn')" variant="link" @click="confirmSent = ''; mode = 'signin'" />
  </div>

  <div v-else class="space-y-5">
    <div>
      <h1 class="site-title text-2xl">{{ mode === 'signin' ? t('auth.welcome') : t('auth.createTitle') }}</h1>
      <p v-if="mode === 'signup'" class="text-sm text-muted">{{ t('auth.createNote') }}</p>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField v-if="mode === 'signup'" name="name" :label="t('auth.name')">
        <UInput v-model="state.name" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField name="email" :label="t('auth.email')">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField name="password" :label="t('auth.password')">
        <template v-if="mode === 'signin'" #hint>
          <ULink to="/forgot-password" class="text-xs text-primary">{{ t('auth.forgot') }}</ULink>
        </template>
        <UInput v-model="state.password" type="password" :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'" class="w-full" />
      </UFormField>
      <UButton type="submit" block size="lg" :loading="loading" :label="mode === 'signin' ? t('auth.signIn') : t('auth.signUp')" />
    </UForm>

    <p class="text-center text-sm text-muted">
      {{ mode === 'signin' ? t('auth.newHere') : t('auth.haveAccount') }}
      <UButton variant="link" class="p-0" :label="mode === 'signin' ? t('auth.signUp') : t('auth.signIn')" @click="mode = mode === 'signin' ? 'signup' : 'signin'" />
    </p>
  </div>
</template>
