import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

// Android back button walks the Ionic navigation stack before leaving the app.
export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  const router = useRouter()
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) router.back()
    else App.exitApp()
  })
})
