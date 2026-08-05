import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ConfirmDeleteModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
  title: string
  description: string
  confirmLabel?: string
}

/** Every destructive admin action (delete court/closure/pricing rule) confirms through this one dialog. */
export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  title,
  description,
  confirmLabel,
}: ConfirmDeleteModalProps) {
  const { t } = useTranslation()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('admin.pricing.cancel')}
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel ?? t('admin.courts.delete')}
          </Button>
        </>
      }
    >
      <p className="text-sm text-text-muted">{description}</p>
    </Modal>
  )
}
