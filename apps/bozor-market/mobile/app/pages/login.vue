<script setup lang="ts">
import * as z from 'zod'
import { app } from '#core/schema'

const route = useRouter().currentRoute.value
const router = useIonRouter()
const { signIn, signUp } = useAuth()
const notify = useNotify()

const mode = ref<'signin' | 'signup'>(route.query.mode === 'signup' ? 'signup' : 'signin')
const loading = ref(false)
const confirmSent = ref('')
const errors = ref<Record<string, string>>({})
const state = reactive({ name: '', email: typeof route.query.email === 'string' ? route.query.email : '', password: '' })

const schema = computed(() => z.object({
  name: mode.value === 'signup' ? z.string().trim().min(1, 'Enter your name') : z.string(),
  email: z.email('Enter a valid email address'),
  password: mode.value === 'signup' ? z.string().min(8, 'Use at least 8 characters') : z.string().min(1, 'Enter your password')
}))

async function submit() {
  const parsed = schema.value.safeParse(state)
  errors.value = parsed.success ? {} : Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0]), i.message]))
  if (!parsed.success) return
  loading.value = true
  try {
    if (mode.value === 'signin') {
      await signIn(state.email, state.password)
      router.navigate(safeRedirect(route.query.redirect), 'root', 'replace')
    } else {
      const needsConfirm = await signUp(state.email, state.password, state.name.trim())
      if (needsConfirm) confirmSent.value = state.email
      else router.navigate(safeRedirect(route.query.redirect), 'root', 'replace')
    }
  } catch (err: any) {
    await notify.toast(err?.message ?? String(err), 'danger', 4000)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding">
      <div class="auth-wrap">
        <h1>{{ app.name }}</h1>
        <p class="muted">{{ app.description }}</p>

        <div v-if="confirmSent" class="ion-padding-vertical">
          <h2>Check your email</h2>
          <p>We sent a confirmation link to <strong>{{ confirmSent }}</strong>. Open it, then sign in here.</p>
          <ion-button fill="clear" @click="confirmSent = ''; mode = 'signin'">Back to sign in</ion-button>
        </div>

        <form v-else @submit.prevent="submit">
          <ion-segment v-model="mode" class="ion-margin-vertical">
            <ion-segment-button value="signin"><ion-label>Sign in</ion-label></ion-segment-button>
            <ion-segment-button value="signup"><ion-label>Create account</ion-label></ion-segment-button>
          </ion-segment>
          <ion-list>
            <template v-if="mode === 'signup'">
              <ion-item>
                <ion-input v-model="state.name" label="Full name" label-placement="stacked" autocomplete="name" />
              </ion-item>
              <span v-if="errors.name" class="field-error">{{ errors.name }}</span>
            </template>
            <ion-item>
              <ion-input v-model="state.email" label="Email" label-placement="stacked" type="email" autocomplete="email" inputmode="email" />
            </ion-item>
            <span v-if="errors.email" class="field-error">{{ errors.email }}</span>
            <ion-item>
              <ion-input v-model="state.password" label="Password" label-placement="stacked" type="password" :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'">
                <ion-input-password-toggle slot="end" />
              </ion-input>
            </ion-item>
            <span v-if="errors.password" class="field-error">{{ errors.password }}</span>
          </ion-list>
          <ion-button type="submit" expand="block" class="ion-margin-top" :disabled="loading">
            <ion-spinner v-if="loading" slot="start" name="crescent" />
            {{ mode === 'signin' ? 'Sign in' : 'Create account' }}
          </ion-button>
          <ion-button v-if="mode === 'signin'" fill="clear" expand="block" router-link="/forgot-password">Forgot password?</ion-button>
        </form>
      </div>
    </ion-content>
  </ion-page>
</template>
