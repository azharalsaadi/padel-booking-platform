import { useState } from 'react'
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
        show({ variant: 'success', title: 'Closure removed' })
      },
      onError: (error) => {
        setConfirmingId(null)
        show({ variant: 'error', title: 'Could not remove closure', description: parseApiError(error).message })
      },
    })
  }

  function handleDeleteBatch() {
    if (!batchId) return
    deleteBatchMutation.mutate(batchId, {
      onSuccess: (result) => {
        setConfirmingBatch(null)
        show({ variant: 'success', title: `Removed ${result.deleted_count} closures` })
      },
      onError: (error) => {
        setConfirmingBatch(null)
        show({ variant: 'error', title: 'Could not remove closure batch', description: parseApiError(error).message })
      },
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {isBatch && <Badge variant="info">Batch of {group.length}</Badge>}
          {group[0].reason && <span className="text-sm text-text-muted">{group[0].reason}</span>}
        </div>
        {isBatch && (
          <Button size="sm" variant="danger" onClick={() => setConfirmingBatch(batchId)}>
            Delete entire batch
          </Button>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {group.map((closure) => (
          <li key={closure.id} className="flex items-center justify-between gap-3 rounded-control border border-border px-3 py-2 text-sm">
            <span className="text-text">
              {closure.court_name ?? 'All courts'} &middot;{' '}
              {closure.date_start === closure.date_end
                ? formatDateLabel(closure.date_start)
                : `${formatDateLabel(closure.date_start)} – ${formatDateLabel(closure.date_end)}`}{' '}
              &middot;{' '}
              {closure.is_full_day
                ? 'Full day'
                : `${formatTimeLabel(closure.start_time ?? '00:00')} – ${formatTimeLabel(closure.end_time ?? '00:00')}`}
            </span>
            <Button size="sm" variant="ghost" onClick={() => setConfirmingId(closure.id)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <ConfirmDeleteModal
        open={confirmingId !== null}
        onClose={() => setConfirmingId(null)}
        onConfirm={() => confirmingId !== null && handleDeleteOne(confirmingId)}
        isLoading={deleteMutation.isPending}
        title="Remove this closure?"
        description="Slots on this date will become available again for booking."
      />

      <ConfirmDeleteModal
        open={confirmingBatch !== null}
        onClose={() => setConfirmingBatch(null)}
        onConfirm={handleDeleteBatch}
        isLoading={deleteBatchMutation.isPending}
        title="Delete this entire closure batch?"
        description={`All ${group.length} closures created together will be removed.`}
      />
    </Card>
  )
}

export function ClosuresPage() {
  const { show } = useToast()
  const courtsQuery = useCourts()
  const closuresQuery = useClosures()
  const createMutation = useCreateClosure()
  const [createError, setCreateError] = useState<string | null>(null)

  function handleCreate(payload: CreateClosurePayload) {
    setCreateError(null)
    createMutation.mutate(payload, {
      onSuccess: (created) => show({ variant: 'success', title: `Created ${created.length} closure${created.length === 1 ? '' : 's'}` }),
      onError: (error) => setCreateError(parseApiError(error).message),
    })
  }

  return (
    <Container className="flex flex-col gap-6 py-2">
      <h1 className="text-2xl font-semibold text-text">Closures</h1>

      <Card>
        <h2 className="text-lg font-semibold text-text">Add a closure</h2>
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
        <h2 className="text-lg font-semibold text-text">Existing closures</h2>

        {closuresQuery.isLoading && (
          <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading closures">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        )}

        {closuresQuery.isError && (
          <ErrorMessage
            message="We couldn't load closures."
            action={
              <Button size="sm" onClick={() => closuresQuery.refetch()}>
                Try again
              </Button>
            }
          />
        )}

        {closuresQuery.data && closuresQuery.data.data.length === 0 && (
          <Card>
            <EmptyState title="No closures" description="Courts are open according to their working hours." />
          </Card>
        )}

        {closuresQuery.data &&
          groupByBatch(closuresQuery.data.data).map((group) => <ClosureGroupCard key={group[0].batch_id ?? group[0].id} group={group} />)}
      </div>
    </Container>
  )
}
