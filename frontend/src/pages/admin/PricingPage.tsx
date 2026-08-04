import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal'
import { PricingRuleFormModal } from '@/components/admin/PricingRuleFormModal'
import { useCreatePricingRule, useDeletePricingRule, usePricingRules, useUpdatePricingRule } from '@/hooks/admin/usePricingRules'
import { useToast } from '@/hooks/useToast'
import { parseApiError } from '@/api/errors'
import { formatBaisa } from '@/lib/money'
import type { PricingRule, PricingRulePayload } from '@/types/admin'

function describeHours(rule: PricingRule): string {
  if (rule.hours_to === null) return `${rule.hours_from}+ hours`
  if (rule.hours_from === rule.hours_to) return `${rule.hours_from} hour${rule.hours_from === 1 ? '' : 's'}`
  return `${rule.hours_from}–${rule.hours_to} hours`
}

export function PricingPage() {
  const { show } = useToast()
  const rulesQuery = usePricingRules()
  const createMutation = useCreatePricingRule()
  const [editingRule, setEditingRule] = useState<PricingRule | null | undefined>(undefined)
  const [deletingRule, setDeletingRule] = useState<PricingRule | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const updateMutation = useUpdatePricingRule(editingRule?.id ?? -1)
  const deleteMutation = useDeletePricingRule()

  function handleSubmit(payload: PricingRulePayload) {
    setFormError(null)
    const mutation = editingRule ? updateMutation : createMutation
    mutation.mutate(payload, {
      onSuccess: () => {
        show({ variant: 'success', title: editingRule ? 'Pricing rule updated' : 'Pricing rule added' })
        setEditingRule(undefined)
      },
      onError: (error) => setFormError(parseApiError(error).message),
    })
  }

  function handleDelete() {
    if (!deletingRule) return
    deleteMutation.mutate(deletingRule.id, {
      onSuccess: () => {
        setDeletingRule(null)
        show({ variant: 'success', title: 'Pricing rule deleted' })
      },
      onError: (error) => {
        setDeletingRule(null)
        show({ variant: 'error', title: 'Could not delete pricing rule', description: parseApiError(error).message })
      },
    })
  }

  return (
    <Container className="flex flex-col gap-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-text">Pricing Rules</h1>
        <Button
          onClick={() => {
            setFormError(null)
            setEditingRule(null)
          }}
        >
          Add rule
        </Button>
      </div>

      {rulesQuery.isLoading && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading pricing rules">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      )}

      {rulesQuery.isError && (
        <ErrorMessage
          message="We couldn't load pricing rules."
          action={
            <Button size="sm" onClick={() => rulesQuery.refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {rulesQuery.data && rulesQuery.data.length === 0 && (
        <Card>
          <EmptyState title="No pricing rules" description="Add a rule to start charging for bookings." />
        </Card>
      )}

      {rulesQuery.data && rulesQuery.data.length > 0 && (
        <div className="flex flex-col gap-3">
          {rulesQuery.data.map((rule) => (
            <Card key={rule.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-text">{describeHours(rule)}</p>
                <p className="text-sm text-text-muted">{formatBaisa(rule.price_per_hour_baisa)} / hour</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rule.is_active ? 'success' : 'neutral'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setFormError(null)
                    setEditingRule(rule)
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeletingRule(rule)}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PricingRuleFormModal
        open={editingRule !== undefined}
        onClose={() => setEditingRule(undefined)}
        onSubmit={handleSubmit}
        isSubmitting={editingRule ? updateMutation.isPending : createMutation.isPending}
        error={formError}
        rule={editingRule}
      />

      <ConfirmDeleteModal
        open={deletingRule !== null}
        onClose={() => setDeletingRule(null)}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        title="Delete this pricing rule?"
        description="Future quotes will no longer use this tier."
      />
    </Container>
  )
}
