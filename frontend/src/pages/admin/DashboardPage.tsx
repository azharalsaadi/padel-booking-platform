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
  const today = toLocalIsoDate(new Date())

  const courtsQuery = useCourts()
  const todayBookingsQuery = useAdminBookings({ date_from: today, date_to: today })
  const pendingBookingsQuery = useAdminBookings({ status: 'pending_payment' })
  const confirmedBookingsQuery = useAdminBookings({ status: 'confirmed' })

  const activeCourts = courtsQuery.data?.data.filter((court) => court.is_active).length

  return (
    <Container className="flex flex-col gap-6 py-2">
      <h1 className="text-2xl font-semibold text-text">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Active courts"
          value={activeCourts}
          isLoading={courtsQuery.isLoading}
          isError={courtsQuery.isError}
          description={
            (courtsQuery.data?.meta.total ?? 0) > 20 ? 'Of first 20 courts loaded' : undefined
          }
        />
        <SummaryCard
          label="Bookings today"
          value={todayBookingsQuery.data?.meta.total}
          isLoading={todayBookingsQuery.isLoading}
          isError={todayBookingsQuery.isError}
        />
        <SummaryCard
          label="Pending payments"
          value={pendingBookingsQuery.data?.meta.total}
          isLoading={pendingBookingsQuery.isLoading}
          isError={pendingBookingsQuery.isError}
        />
        <SummaryCard
          label="Confirmed bookings"
          value={confirmedBookingsQuery.data?.meta.total}
          isLoading={confirmedBookingsQuery.isLoading}
          isError={confirmedBookingsQuery.isError}
        />
      </div>
    </Container>
  )
}
