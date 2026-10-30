<script setup lang="ts">
import * as z from 'zod'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign in' })

const route = useRoute()
const { signIn, signUp } = useAuth()
const toast = useToast()

const mode = ref<'signin' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'signin')
const loading = ref(false)
const confirmSent = ref('')
const state = reactive({ name: '', email: typeof route.query.email === 'string' ? route.query.email : '', password: '' })

const schema = computed(() => z.object({
  name: mode.value === 'signup' ? z.string().trim().min(1, 'Enter your name') : z.string().optional(),
  email: z.email('Enter a valid email address'),
  password: mode.value === 'signup' ? z.string().min(8, 'Use at least 8 characters') : z.string().min(1, 'Enter your password')
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
    toast.add({ title: mode.value === 'signin' ? 'Could not sign in' : 'Could not create account', description: err?.message ?? String(err), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="confirmSent" class="space-y-3 text-center">
    <UIcon name="i-lucide-mail-check" class="mx-auto size-10 text-primary" />
    <h1 class="text-lg font-semibold text-highlighted">Check your email</h1>
    <p class="text-sm text-muted">We sent a confirmation link to <strong>{{ confirmSent }}</strong>. Open it, then sign in here.</p>
    <UButton label="Back to sign in" variant="link" @click="confirmSent = ''; mode = 'signin'" />
  </div>

  <div v-else class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold text-highlighted">{{ mode === 'signin' ? 'Sign in' : 'Create your account' }}</h1>
      <p class="text-sm text-muted">
        {{ mode === 'signin' ? 'Welcome back.' : 'It takes less than a minute.' }}
      </p>
    </div>

    <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField v-if="mode === 'signup'" name="name" label="Full name">
        <UInput v-model="state.name" autocomplete="name" class="w-full" />
      </UFormField>
      <UFormField name="email" label="Email">
        <UInput v-model="state.email" type="email" autocomplete="email" class="w-full" />
      </UFormField>
      <UFormField name="password" label="Password">
        <template v-if="mode === 'signin'" #hint>
          <ULink to="/forgot-password" class="text-xs text-primary">Forgot password?</ULink>
        </template>
        <UInput v-model="state.password" type="password" :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'" class="w-full" />
      </UFormField>
      <UButton type="submit" block :loading="loading" :label="mode === 'signin' ? 'Sign in' : 'Create account'" />
    </UForm>

    <p class="text-center text-sm text-muted">
      {{ mode === 'signin' ? 'New here?' : 'Already have an account?' }}
      <UButton variant="link" class="p-0" :label="mode === 'signin' ? 'Create an account' : 'Sign in'" @click="mode = mode === 'signin' ? 'signup' : 'signin'" />
    </p>
  </div>
</template>
