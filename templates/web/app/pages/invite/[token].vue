<script setup lang="ts">
definePageMeta({ layout: 'auth' })
useHead({ title: 'Join workspace' })

const route = useRoute()
const token = String(route.params.token)
const { user, signOut } = useAuth()
const ws = useWorkspace()
const toast = useToast()

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

async function accept() {
  joining.value = true
  try {
    const { data, error } = await useSupabase().rpc('accept_invitation', { p_token: token })
    if (error) throw error
    await ws.load()
    ws.select(data as string)
    toast.add({ title: `Welcome to ${invite.value?.org_name}`, color: 'success' })
    await navigateTo('/')
  } catch (err) {
    toast.add({ title: 'Could not join', description: friendlyError(err), color: 'error' })
  } finally {
    joining.value = false
  }
}
</script>

<template>
  <USkeleton v-if="loading" class="h-24 w-full" />
  <div v-else-if="!invite || invite.expired" class="space-y-3 text-center">
    <UIcon name="i-lucide-link-2-off" class="mx-auto size-10 text-muted" />
    <h1 class="text-lg font-semibold text-highlighted">This invite link is no longer valid</h1>
    <p class="text-sm text-muted">It may have been used already or expired. Ask for a new one.</p>
    <UButton to="/" label="Go to the app" variant="link" />
  </div>
  <div v-else class="space-y-5">
    <div>
      <h1 class="text-lg font-semibold text-highlighted">Join {{ invite.org_name }}</h1>
      <p class="text-sm text-muted">You were invited as <strong>{{ invite.role }}</strong> using {{ invite.email }}.</p>
    </div>
    <template v-if="!user">
      <UButton block label="Create an account" :to="{ path: '/login', query: { mode: 'signup', email: invite.email, redirect: route.fullPath } }" />
      <UButton block color="neutral" variant="outline" label="I already have an account" :to="{ path: '/login', query: { email: invite.email, redirect: route.fullPath } }" />
    </template>
    <template v-else-if="wrongAccount">
      <UAlert color="warning" variant="subtle" icon="i-lucide-user-x" :title="`You are signed in as ${user.email}`" description="Sign in with the invited email address to accept." />
      <UButton block color="neutral" variant="outline" label="Sign out" @click="signOut()" />
    </template>
    <UButton v-else block :loading="joining" label="Accept invitation" @click="accept" />
  </div>
</template>
