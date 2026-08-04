import { useState } from 'react'
import { Link } from 'react-router-dom'
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
import type { Court } from '@/types/admin'

function CourtCard({ court }: { court: Court }) {
  const { show } = useToast()
  const updateMutation = useUpdateCourt(court.id)
  const deleteMutation = useDeleteCourt()
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  function handleToggleActive() {
    updateMutation.mutate(
      { name: court.name, description: court.description, sort_order: court.sort_order, is_active: !court.is_active },
      {
        onSuccess: () => show({ variant: 'success', title: court.is_active ? 'Court deactivated' : 'Court activated' }),
        onError: (error) => show({ variant: 'error', title: 'Could not update court', description: parseApiError(error).message }),
      },
    )
  }

  function handleDelete() {
    deleteMutation.mutate(court.id, {
      onSuccess: () => {
        setIsConfirmingDelete(false)
        show({ variant: 'success', title: 'Court deleted' })
      },
      onError: (error) => {
        setIsConfirmingDelete(false)
        show({ variant: 'error', title: 'Could not delete court', description: parseApiError(error).message })
      },
    })
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-text">{court.name}</h2>
        <Badge variant={court.is_active ? 'success' : 'neutral'}>{court.is_active ? 'Active' : 'Inactive'}</Badge>
      </div>
      {court.description && <p className="text-sm text-text-muted">{court.description}</p>}
      <p className="text-xs text-text-muted">Sort order: {court.sort_order}</p>

      <div className="mt-2 flex flex-wrap gap-2">
        <Link to={`/admin/courts/${court.id}`}>
          <Button size="sm" variant="secondary">
            Edit
          </Button>
        </Link>
        <Button size="sm" variant="secondary" onClick={handleToggleActive} isLoading={updateMutation.isPending}>
          {court.is_active ? 'Deactivate' : 'Activate'}
        </Button>
        <Button size="sm" variant="danger" onClick={() => setIsConfirmingDelete(true)}>
          Delete
        </Button>
      </div>

      <ConfirmDeleteModal
        open={isConfirmingDelete}
        onClose={() => setIsConfirmingDelete(false)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title="Delete this court?"
        description={`"${court.name}" will be removed from future availability. Historical bookings are not affected.`}
      />
    </Card>
  )
}

export function CourtsPage() {
  const courtsQuery = useCourts()

  return (
    <Container className="flex flex-col gap-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Courts</h1>
        <Link to="/admin/courts/new">
          <Button>Add court</Button>
        </Link>
      </div>

      {courtsQuery.isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading courts">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
      )}

      {courtsQuery.isError && (
        <ErrorMessage
          message="We couldn't load the courts list."
          action={
            <Button size="sm" onClick={() => courtsQuery.refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {courtsQuery.data && courtsQuery.data.data.length === 0 && (
        <Card>
          <EmptyState
            title="No courts yet"
            description="Add your first court to start accepting bookings."
            action={
              <Link to="/admin/courts/new">
                <Button size="sm">Add court</Button>
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
