import ConfirmModal from '~/components/ConfirmModal.vue'

// const ok = await confirm({ title: 'Delete deal?', danger: true })
export function useConfirm() {
  const modal = useOverlay().create(ConfirmModal)
  return async (props: { title: string, description?: string, confirmLabel?: string, danger?: boolean }) =>
    Boolean(await modal.open(props).result)
}
