import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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

function describeHours(rule: PricingRule, t: TFunction): string {
  if (rule.hours_to === null) return t('admin.pricing.plusHoursSuffix', { count: rule.hours_from })
  if (rule.hours_from === rule.hours_to) return t('admin.pricing.hourSuffix', { count: rule.hours_from })
  return t('admin.pricing.hoursRange', { from: rule.hours_from, to: rule.hours_to })
}

export function PricingPage() {
  const { t } = useTranslation()
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
        show({ variant: 'success', title: editingRule ? t('admin.pricing.ruleUpdated') : t('admin.pricing.ruleAdded') })
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
        show({ variant: 'success', title: t('admin.pricing.ruleDeleted') })
      },
      onError: (error) => {
        setDeletingRule(null)
        show({ variant: 'error', title: t('admin.pricing.couldNotDeleteRule'), description: parseApiError(error).message })
      },
    })
  }

  return (
    <Container className="flex flex-col gap-6 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{t('admin.pricing.title')}</h1>
          <p className="mt-1 text-sm text-text-muted">{t('admin.pricing.description')}</p>
        </div>
        <Button
          onClick={() => {
            setFormError(null)
            setEditingRule(null)
          }}
        >
          {t('admin.pricing.addRule')}
        </Button>
      </div>

      {rulesQuery.isLoading && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label={t('admin.pricing.loadingRules')}>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      )}

      {rulesQuery.isError && (
        <ErrorMessage
          message={t('admin.pricing.couldNotLoad')}
          action={
            <Button size="sm" onClick={() => rulesQuery.refetch()}>
              {t('admin.pricing.tryAgain')}
            </Button>
          }
        />
      )}

      {rulesQuery.data && rulesQuery.data.length === 0 && (
        <Card>
          <EmptyState title={t('admin.pricing.noRulesTitle')} description={t('admin.pricing.noRulesDescription')} />
        </Card>
      )}

      {rulesQuery.data && rulesQuery.data.length > 0 && (
        <div className="flex flex-col gap-3">
          {rulesQuery.data.map((rule) => (
            <Card key={rule.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-text">{describeHours(rule, t)}</p>
                <p className="text-sm text-text-muted">
                  {formatBaisa(rule.price_per_hour_baisa)} {t('admin.pricing.perHour')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={rule.is_active ? 'success' : 'neutral'}>{rule.is_active ? t('admin.pricing.active') : t('admin.pricing.inactive')}</Badge>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setFormError(null)
                    setEditingRule(rule)
                  }}
                >
                  {t('admin.pricing.edit')}
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeletingRule(rule)}>
                  {t('admin.pricing.delete')}
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
        title={t('admin.pricing.deleteModalTitle')}
        description={t('admin.pricing.deleteModalDescription')}
      />
    </Container>
  )
}
