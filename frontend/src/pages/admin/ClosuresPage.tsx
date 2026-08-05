import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { ClosureForm } from '@/components/admin/ClosureForm'
import { useCourts } from '@/hooks/admin/useCourts'
import { useClosures, useCreateClosure, useDeleteClosure, useDeleteClosureBatch } from '@/hooks/admin/useClosures'
import { useToast } from '@/hooks/useToast'
import { parseApiError } from '@/api/errors'
import { formatDateLabel, formatTimeLabel } from '@/lib/datetime'
import type { CourtClosure, CreateClosurePayload } from '@/types/admin'

function groupByBatch(closures: CourtClosure[]): CourtClosure[][] {
  const groups = new Map<string, CourtClosure[]>()

  for (const closure of closures) {
    const key = closure.batch_id ?? `single-${closure.id}`
    const group = groups.get(key) ?? []
    group.push(closure)
    groups.set(key, group)
  }

  return [...groups.values()]
}

function ClosureGroupCard({ group }: { group: CourtClosure[] }) {
  const { t } = useTranslation()
  const { show } = useToast()
  const deleteMutation = useDeleteClosure()
  const deleteBatchMutation = useDeleteClosureBatch()
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [confirmingBatch, setConfirmingBatch] = useState<string | null>(null)

  const batchId = group[0].batch_id
  const isBatch = group.length > 1 && batchId !== null

  function handleDeleteOne(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        setConfirmingId(null)
        show({ variant: 'success', title: t('admin.closures.closureRemoved') })
      },
      onError: (error) => {
        setConfirmingId(null)
        show({ variant: 'error', title: t('admin.closures.couldNotRemoveClosure'), description: parseApiError(error).message })
      },
    })
  }

  function handleDeleteBatch() {
    if (!batchId) return
    deleteBatchMutation.mutate(batchId, {
      onSuccess: (result) => {
        setConfirmingBatch(null)
        show({ variant: 'success', title: t('admin.closures.removedNClosures', { count: result.deleted_count }) })
      },
      onError: (error) => {
        setConfirmingBatch(null)
        show({ variant: 'error', title: t('admin.closures.couldNotRemoveBatch'), description: parseApiError(error).message })
      },
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isBatch && <Badge variant="info">{t('admin.closures.batchOf', { count: group.length })}</Badge>}
          {group[0].reason && <span className="text-sm text-text-muted">{group[0].reason}</span>}
        </div>
        {isBatch && (
          <Button size="sm" variant="danger" onClick={() => setConfirmingBatch(batchId)}>
            {t('admin.closures.deleteEntireBatch')}
          </Button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {group.map((closure) => (
          <li key={closure.id} className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2 text-sm">
            <span className="text-text">
              {closure.court_name ?? t('admin.closures.allCourts')} &middot;{' '}
              {closure.date_start === closure.date_end
                ? formatDateLabel(closure.date_start)
                : `${formatDateLabel(closure.date_start)} – ${formatDateLabel(closure.date_end)}`}{' '}
              &middot;{' '}
              {closure.is_full_day
                ? t('admin.closures.fullDay')
                : `${formatTimeLabel(closure.start_time ?? '00:00')} – ${formatTimeLabel(closure.end_time ?? '00:00')}`}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingId(closure.id)}>
              {t('admin.closures.remove')}
            </Button>
          </li>
        ))}
      </ul>

      <ConfirmDeleteModal
        open={confirmingId !== null}
        onClose={() => setConfirmingId(null)}
        onConfirm={() => confirmingId !== null && handleDeleteOne(confirmingId)}
        isLoading={deleteMutation.isPending}
        title={t('admin.closures.removeModalTitle')}
        description={t('admin.closures.removeModalDescription')}
      />

      <ConfirmDeleteModal
        open={confirmingBatch !== null}
        onClose={() => setConfirmingBatch(null)}
        onConfirm={handleDeleteBatch}
        isLoading={deleteBatchMutation.isPending}
        title={t('admin.closures.deleteBatchModalTitle')}
        description={t('admin.closures.deleteBatchModalDescription', { count: group.length })}
      />
    </Card>
  )
}

export function ClosuresPage() {
  const { t } = useTranslation()
  const { show } = useToast()
  const courtsQuery = useCourts()
  const closuresQuery = useClosures()
  const createMutation = useCreateClosure()
  const [createError, setCreateError] = useState<string | null>(null)

  function handleCreate(payload: CreateClosurePayload) {
    setCreateError(null)
    createMutation.mutate(payload, {
      onSuccess: (created) => show({ variant: 'success', title: t('admin.closures.createdNClosures', { count: created.length }) }),
      onError: (error) => setCreateError(parseApiError(error).message),
    })
  }

  return (
    <Container className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold text-text">{t('admin.closures.title')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('admin.closures.description')}</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-text">{t('admin.closures.addClosureTitle')}</h2>
        <div className="mt-4">
          {courtsQuery.data && (
            <ClosureForm
              courts={courtsQuery.data.data}
              onSubmit={handleCreate}
              isSubmitting={createMutation.isPending}
              error={createError}
            />
          )}
          {courtsQuery.isLoading && <Skeleton className="h-40 w-full" />}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-text">{t('admin.closures.existingClosuresTitle')}</h2>

        {closuresQuery.isLoading && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label={t('admin.closures.loadingClosures')}>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        )}

        {closuresQuery.isError && (
          <ErrorMessage
            message={t('admin.closures.couldNotLoad')}
            action={
              <Button size="sm" onClick={() => closuresQuery.refetch()}>
                {t('admin.closures.tryAgain')}
              </Button>
            }
          />
        )}

        {closuresQuery.data && closuresQuery.data.data.length === 0 && (
          <Card>
            <EmptyState title={t('admin.closures.noClosuresTitle')} description={t('admin.closures.noClosuresDescription')} />
          </Card>
        )}

        {closuresQuery.data &&
          groupByBatch(closuresQuery.data.data).map((group) => <ClosureGroupCard key={group[0].batch_id ?? group[0].id} group={group} />)}
      </div>
    </Container>
  )
}
