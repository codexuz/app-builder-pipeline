<script setup lang="ts">
const route = useRouter().currentRoute.value
const token = String(route.params.token)
const path = route.fullPath
const router = useIonRouter()
const { user, signOut } = useAuth()
const ws = useWorkspace()
const notify = useNotify()

interface Preview { org_name: string, email: string, role: string, expired: boolean }
const invite = ref<Preview | null>(null)
const loading = ref(true)
const joining = ref(false)

onMounted(async () => {
  const { data } = await useSupabase().rpc('invitation_preview', { p_token: token })
  invite.value = (data as Preview[] | null)?.[0] ?? null
  loading.value = false
})

const wrongAccount = computed(() => user.value && invite.value && user.value.email?.toLowerCase() !== invite.value.email.toLowerCase())
const loginLink = (signup: boolean) => `/login?${new URLSearchParams({ ...(signup ? { mode: 'signup' } : {}), email: invite.value?.email ?? '', redirect: path })}`

async function accept() {
  joining.value = true
  try {
    const { data, error } = await useSupabase().rpc('accept_invitation', { p_token: token })
    if (error) throw error
    await ws.load()
    ws.select(data as string)
    await notify.toast(`Welcome to ${invite.value?.org_name}`, 'success')
    router.navigate('/', 'root', 'replace')
  } catch (err) {
    await notify.error('Could not join', err)
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-content class="ion-padding">
      <div class="auth-wrap">
        <ion-spinner v-if="loading" name="crescent" />
        <template v-else-if="!invite || invite.expired">
          <h1>Invite link not valid</h1>
          <p class="muted">It may have been used already or expired. Ask for a new one.</p>
          <ion-button fill="clear" router-link="/">Open the app</ion-button>
        </template>
        <template v-else>
          <h1>Join {{ invite.org_name }}</h1>
          <p class="muted">You were invited as <strong>{{ invite.role }}</strong> using {{ invite.email }}.</p>
          <template v-if="!user">
            <ion-button expand="block" :router-link="loginLink(true)">Create an account</ion-button>
            <ion-button expand="block" fill="outline" :router-link="loginLink(false)">I already have an account</ion-button>
          </template>
          <template v-else-if="wrongAccount">
            <p>You are signed in as {{ user.email }}. Sign in with the invited address to accept.</p>
            <ion-button expand="block" fill="outline" @click="signOut()">Sign out</ion-button>
          </template>
          <ion-button v-else expand="block" :disabled="joining" @click="accept">Accept invitation</ion-button>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>
