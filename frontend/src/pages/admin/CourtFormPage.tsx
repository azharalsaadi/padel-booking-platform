import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Skeleton } from '@/components/ui/Skeleton'
import { WorkingHoursEditor } from '@/components/admin/WorkingHoursEditor'
import { useCourt, useCreateCourt, useUpdateCourt, useUpdateCourtWorkingHours } from '@/hooks/admin/useCourts'
import { useToast } from '@/hooks/useToast'
import { parseApiError } from '@/api/errors'
import type { CourtWorkingHourEntry } from '@/types/admin'

export function CourtFormPage() {
  const { id } = useParams<{ id?: string }>()
  const courtId = id ? Number(id) : null
  const isEditing = courtId !== null

  const navigate = useNavigate()
  const { show } = useToast()

  const courtQuery = useCourt(courtId ?? -1)
  const createMutation = useCreateCourt()
  const updateMutation = useUpdateCourt(courtId ?? -1)
  const workingHoursMutation = useUpdateCourtWorkingHours(courtId ?? -1)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [isActive, setIsActive] = useState(true)
  const [nameError, setNameError] = useState<string | undefined>()
  const [descriptionError, setDescriptionError] = useState<string | undefined>()
  const [generalError, setGeneralError] = useState<string | null>(null)

  useEffect(() => {
    if (courtQuery.data) {
      setName(courtQuery.data.name)
      setDescription(courtQuery.data.description ?? '')
      setSortOrder(String(courtQuery.data.sort_order))
      setIsActive(courtQuery.data.is_active)
    }
  }, [courtQuery.data])

  if (isEditing && courtQuery.isLoading) {
    return (
      <Container className="py-2">
        <Card aria-busy="true" aria-label="Loading court">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="mt-4 h-24 w-full" />
        </Card>
      </Container>
    )
  }

  if (isEditing && courtQuery.isError) {
    return (
      <Container className="py-2">
        <ErrorMessage
          message="We couldn't load this court."
          action={
            <Button size="sm" onClick={() => courtQuery.refetch()}>
              Try again
            </Button>
          }
        />
      </Container>
    )
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setNameError(undefined)
    setDescriptionError(undefined)
    setGeneralError(null)

    if (name.trim() === '') {
      setNameError('Court name is required.')
      return
    }

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
    }

    const mutation = isEditing ? updateMutation : createMutation
    mutation.mutate(payload, {
      onSuccess: () => {
        show({ variant: 'success', title: isEditing ? 'Court updated' : 'Court created' })
        navigate('/admin/courts')
      },
      onError: (error) => {
        const parsed = parseApiError(error)
        const nameFieldError = parsed.fieldErrors?.name?.[0]
        const descriptionFieldError = parsed.fieldErrors?.description?.[0]
        setNameError(nameFieldError)
        setDescriptionError(descriptionFieldError)
        // Falls back to the banner only for fields with no dedicated
        // inline slot (e.g. sort_order) — every field error must be
        // shown somewhere, not silently dropped.
        setGeneralError(nameFieldError || descriptionFieldError ? null : parsed.message)
      },
    })
  }

  function handleSaveWorkingHours(workingHours: CourtWorkingHourEntry[]) {
    workingHoursMutation.mutate(workingHours, {
      onSuccess: () => show({ variant: 'success', title: 'Working hours saved' }),
      onError: (error) => show({ variant: 'error', title: 'Could not save working hours', description: parseApiError(error).message }),
    })
  }

  const isSaving = isEditing ? updateMutation.isPending : createMutation.isPending

  return (
    <Container className="flex flex-col gap-6 py-2">
      <h1 className="text-2xl font-semibold text-text">{isEditing ? 'Edit Court' : 'Add Court'}</h1>

      <Card>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} error={nameError} />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            error={descriptionError}
          />
          <Input
            label="Sort order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            helperText="Lower numbers are listed first."
          />
          <Checkbox label="Active" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />

          {generalError && <ErrorMessage message={generalError} />}

          <div>
            <Button type="submit" isLoading={isSaving}>
              {isEditing ? 'Save changes' : 'Create court'}
            </Button>
          </div>
        </form>
      </Card>

      {isEditing && courtQuery.data && (
        <Card>
          <WorkingHoursEditor
            workingHours={courtQuery.data.working_hours ?? []}
            onSave={handleSaveWorkingHours}
            isSaving={workingHoursMutation.isPending}
          />
        </Card>
      )}
    </Container>
  )
}
