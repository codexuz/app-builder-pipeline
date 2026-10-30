import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { alertController, toastController } from '@ionic/vue'

// Native-feeling feedback: toasts, confirm dialogs and the system share sheet.
export function useNotify() {
  async function toast(message: string, color: 'success' | 'danger' | 'medium' = 'medium', duration = 2500) {
    const t = await toastController.create({ message, color, duration, position: 'top' })
    await t.present()
  }

  const error = (title: string, err: unknown) => toast(`${title}: ${friendlyError(err)}`, 'danger', 4000)

  async function confirm(header: string, message?: string, confirmText = 'Confirm', destructive = false) {
    const alert = await alertController.create({
      header,
      message,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: confirmText, role: 'confirm', cssClass: destructive ? 'alert-danger' : undefined }
      ]
    })
    await alert.present()
    const { role } = await alert.onDidDismiss()
    return role === 'confirm'
  }

  // Share sheet on devices; clipboard in the browser.
  async function share(title: string, url: string) {
    if (Capacitor.isNativePlatform() || 'share' in navigator) {
      try {
        await Share.share({ title, url })
        return
      } catch {
        // Dismissed share sheet; fall through to clipboard.
      }
    }
    await navigator.clipboard.writeText(url)
    await toast('Link copied', 'success')
  }

  return { toast, error, confirm, share }
}
