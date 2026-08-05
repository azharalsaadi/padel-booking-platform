import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAdminMe } from '@/hooks/admin/useAdminAuth'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { useSyncAdminLanguage } from '@/i18n/config'

/**
 * Every protected admin route renders through here. Session state is
 * whatever GET /admin/me currently says (see useAdminMe) — there is no
 * separate "am I logged in" flag to fall out of sync with the backend.
 */
export function AdminGuard({ children }: PropsWithChildren) {
  const { t } = useTranslation()
  const location = useLocation()
  const meQuery = useAdminMe()
  useSyncAdminLanguage()

  if (meQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner label={t('admin.nav.checkingSession')} />
      </div>
    )
  }

  if (meQuery.isError || !meQuery.data) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />
  }

  return children
}
