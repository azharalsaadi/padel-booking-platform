import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { useCourts, useDeleteCourt, useUpdateCourt } from '@/hooks/admin/useCourts'
import { useToast } from '@/hooks/useToast'
import { parseApiError } from '@/api/errors'
import { formatTimeLabel } from '@/lib/datetime'
import type { TFunction } from 'i18next'
import type { SupportedLanguage } from '@/i18n/config'
import type { Court } from '@/types/admin'

/** Earliest open / latest close across the court's saved days — "Not set" when none are configured. */
function operatingHoursSummary(court: Court, t: TFunction, locale: 'en' | 'ar'): string {
  const hours = court.working_hours
  if (!hours || hours.length === 0) return t('admin.courts.operatingHoursNotSet')

  const opens = hours.map((entry) => entry.open_time).sort()
  const closes = hours.map((entry) => entry.close_time).sort()
  return `${formatTimeLabel(opens[0], locale)} – ${formatTimeLabel(closes[closes.length - 1], locale)}`
}

function CourtCard({ court }: { court: Court }) {
  const { t, i18n } = useTranslation()
  const { show } = useToast()
  const updateMutation = useUpdateCourt(court.id)
  const deleteMutation = useDeleteCourt()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  function handleToggleActive() {
    updateMutation.mutate(
      { name: court.name, description: court.description, sort_order: court.sort_order, is_active: !court.is_active },
      {
        onSuccess: () => show({ variant: 'success', title: court.is_active ? t('admin.courts.courtDeactivated') : t('admin.courts.courtActivated') }),
        onError: (error) => show({ variant: 'error', title: t('admin.courts.couldNotUpdateCourt'), description: parseApiError(error).message }),
      },
    )
  }

  function handleDelete() {
    deleteMutation.mutate(court.id, {
      onSuccess: () => {
        setIsConfirmingDelete(false)
        show({ variant: 'success', title: t('admin.courts.courtDeleted') })
      },
      onError: (error) => {
        setIsConfirmingDelete(false)
        show({ variant: 'error', title: t('admin.courts.couldNotDeleteCourt'), description: parseApiError(error).message })
      },
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-text">{court.name}</h2>
        <Badge variant={court.is_active ? 'success' : 'neutral'}>{court.is_active ? t('admin.courts.active') : t('admin.courts.inactive')}</Badge>
      </div>
      {court.description && <p className="text-sm text-text-muted">{court.description}</p>}
      <p className="text-xs text-text-muted">
        {t('admin.courts.sortOrderLabel')}: {court.sort_order}
      </p>
      <p className="text-xs text-text-muted">
        {t('admin.courts.operatingHours')}: {operatingHoursSummary(court, t, i18n.language as SupportedLanguage)}
      </p>

      <div className="mt-2 flex flex-wrap gap-2">
        <Link to={`/admin/courts/${court.id}`}>
          <Button size="sm" variant="secondary">
            {t('admin.courts.edit')}
          </Button>
        </Link>
        <Button size="sm" variant="secondary" onClick={handleToggleActive} isLoading={updateMutation.isPending}>
          {court.is_active ? t('admin.courts.deactivate') : t('admin.courts.activate')}
        </Button>
        <Button size="sm" variant="danger" onClick={() => setIsConfirmingDelete(true)}>
          {t('admin.courts.delete')}
        </Button>
      </div>

      <ConfirmDeleteModal
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title={t('admin.courts.deleteModalTitle')}
        description={t('admin.courts.deleteModalDescription', { name: court.name })}
      />
    </Card>
  )
}

export function CourtsPage() {
  const { t } = useTranslation()
  const courtsQuery = useCourts()

  return (
    <Container className="flex flex-col gap-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{t('admin.courts.title')}</h1>
          <p className="mt-1 text-sm text-text-muted">{t('admin.courts.description')}</p>
        </div>
        <Link to="/admin/courts/new">
          <Button>{t('admin.courts.addCourt')}</Button>
        </Link>
      </div>

      {courtsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={t('admin.courts.loadingCourts')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      )}

      {courtsQuery.isError && (
        <ErrorMessage
          message={t('admin.courts.couldNotLoad')}
          action={
            <Button size="sm" onClick={() => courtsQuery.refetch()}>
              {t('admin.courts.tryAgain')}
            </Button>
          }
        />
      )}

      {courtsQuery.data && courtsQuery.data.data.length === 0 && (
        <Card>
          <EmptyState
            title={t('admin.courts.noCourtsTitle')}
            description={t('admin.courts.noCourtsDescription')}
            action={
              <Link to="/admin/courts/new">
                <Button size="sm">{t('admin.courts.addCourt')}</Button>
              </Link>
            }
          />
        </Card>
      )}

      {courtsQuery.data && courtsQuery.data.data.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courtsQuery.data.data.map((court) => (
            <CourtCard key={court.id} court={court} />
          ))}
        </div>
      )}
    </Container>
  )
}
