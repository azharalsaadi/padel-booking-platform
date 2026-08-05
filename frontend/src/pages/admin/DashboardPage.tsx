import { useTranslation } from 'react-i18next'
import { Container } from '@/components/layout/Container'
import { SummaryCard } from '@/components/admin/SummaryCard'
import { useCourts } from '@/hooks/admin/useCourts'
import { useAdminBookings } from '@/hooks/admin/useAdminBookings'
import { toLocalIsoDate } from '@/lib/datetime'

/**
 * Deliberately simple: the backend has no summary/analytics endpoint (and
 * Step 15 isn't meant to invent one), so every number here is a total
 * read straight off an existing list endpoint's pagination meta — never a
 * frontend calculation over unbounded data. The one exception is "active
 * courts", which counts only the first page of courts (the courts list
 * has no way to ask for a count-only response) — accurate for any club
 * with 20 or fewer courts, which this project's scale never exceeds.
 */
export function DashboardPage() {
  const { t } = useTranslation()
  const today = toLocalIsoDate(new Date())

  const courtsQuery = useCourts()
  const todayBookingsQuery = useAdminBookings({ date_from: today, date_to: today })
  const pendingBookingsQuery = useAdminBookings({ status: 'pending_payment' })
  const confirmedBookingsQuery = useAdminBookings({ status: 'confirmed' })

  const activeCourts = courtsQuery.data?.data.filter((court) => court.is_active).length

  return (
    <Container className="flex flex-col gap-6 py-2">
      <div>
        <h1 className="text-2xl font-semibold text-text">{t('admin.dashboard.title')}</h1>
        <p className="mt-1 text-sm text-text-muted">{t('admin.dashboard.description')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label={t('admin.dashboard.activeCourts')}
          value={activeCourts}
          isLoading={courtsQuery.isLoading}
          isError={courtsQuery.isError}
          description={
            (courtsQuery.data?.meta.total ?? 0) > 20 ? t('admin.dashboard.ofFirst20CourtsLoaded') : undefined
          }
        />
        <SummaryCard
          label={t('admin.dashboard.bookingsToday')}
          value={todayBookingsQuery.data?.meta.total}
          isLoading={todayBookingsQuery.isLoading}
          isError={todayBookingsQuery.isError}
        />
        <SummaryCard
          label={t('admin.dashboard.pendingPayments')}
          value={pendingBookingsQuery.data?.meta.total}
          isLoading={pendingBookingsQuery.isLoading}
          isError={pendingBookingsQuery.isError}
        />
        <SummaryCard
          label={t('admin.dashboard.confirmedBookings')}
          value={confirmedBookingsQuery.data?.meta.total}
          isLoading={confirmedBookingsQuery.isLoading}
          isError={confirmedBookingsQuery.isError}
        />
      </div>
    </Container>
  )
}
