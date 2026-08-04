import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPricingRule, deletePricingRule, fetchPricingRules, updatePricingRule } from '@/api/admin'
import type { PricingRulePayload } from '@/types/admin'

const PRICING_RULES_KEY = ['admin', 'pricing-rules']

export function usePricingRules() {
  return useQuery({ queryKey: PRICING_RULES_KEY, queryFn: fetchPricingRules })
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PricingRulePayload) => createPricingRule(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICING_RULES_KEY }),
  })
}

export function useUpdatePricingRule(id: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: PricingRulePayload) => updatePricingRule(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICING_RULES_KEY }),
  })
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePricingRule(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PRICING_RULES_KEY }),
  })
}
