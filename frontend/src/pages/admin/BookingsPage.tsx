import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Container } from '@/components/layout/Container'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { Pagination } from '@/components/ui/Pagination'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table'
import { AdminBookingFilters } from '@/components/admin/AdminBookingFilters'
import { useCourts } from '@/hooks/admin/useCourts'
import { useAdminBookings } from '@/hooks/admin/useAdminBookings'
import { formatBaisa } from '@/lib/money'
import { formatDateLabel, formatTimeLabel } from '@/lib/datetime'
import { BOOKING_STATUS_LABELS, BOOKING_STATUS_VARIANTS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANTS } from '@/lib/status'
import type { AdminBooking, AdminBookingFilters as Filters } from '@/types/admin'

function dateSummary(booking: AdminBooking): string {
  if (booking.slots.length === 0) return '—'
  const first = booking.slots[0]
  const label = `${formatDateLabel(first.date)}, ${formatTimeLabel(first.start_time)}`
  return booking.slots.length === 1 ? label : `${label} (+${booking.slots.length - 1} more)`
}

function courtSummary(booking: AdminBooking): string {
  const names = [...new Set(booking.slots.map((slot) => slot.court_name).filter((name): name is string => Boolean(name)))]
  if (names.length === 0) return '—'
  if (names.length === 1) return names[0]
  return `${names.length} courts`
}

export function BookingsPage() {
  const [filters, setFilters] = useState<Filters>({ per_page: 20, page: 1 })
  const courtsQuery = useCourts()
  const bookingsQuery = useAdminBookings(filters)
  const navigate = useNavigate()

  function updateFilters(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch, page: 1 }))
  }

  function clearFilters() {
    setFilters({ per_page: 20, page: 1 })
  }

  return (
    <Container className="flex flex-col gap-6 py-2">
      <h1 className="text-2xl font-semibold text-text">Bookings</h1>

      <Card>
        <AdminBookingFilters
          courts={courtsQuery.data?.data ?? []}
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
        />
      </Card>

      {bookingsQuery.isLoading && (
        <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading bookings">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>
      )}

      {bookingsQuery.isError && (
        <ErrorMessage
          message="We couldn't load bookings."
          action={
            <Button size="sm" onClick={() => bookingsQuery.refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {bookingsQuery.data && bookingsQuery.data.data.length === 0 && (
        <Card>
          <EmptyState title="No bookings found" description="Try adjusting or clearing the filters above." />
        </Card>
      )}

      {bookingsQuery.data && bookingsQuery.data.data.length > 0 && (
        <>
          {/* Desktop/tablet: a real table with meaningful headings. */}
          <div className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Reference</TableHeaderCell>
                  <TableHeaderCell>Customer</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Payment</TableHeaderCell>
                  <TableHeaderCell>Total</TableHeaderCell>
                  <TableHeaderCell>Dates &amp; times</TableHeaderCell>
                  <TableHeaderCell>Court</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {bookingsQuery.data.data.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>{booking.booking_reference}</TableCell>
                    <TableCell>
                      {booking.customer_name ?? '—'}
                      <span className="block text-text-muted">{booking.customer_phone}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={BOOKING_STATUS_VARIANTS[booking.booking_status]}>{BOOKING_STATUS_LABELS[booking.booking_status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {booking.payment_method === 'thawani' ? 'Thawani' : 'Pay at Venue'}
                      {booking.payment_status && (
                        <Badge variant={PAYMENT_STATUS_VARIANTS[booking.payment_status]} className="ml-2">
                          {PAYMENT_STATUS_LABELS[booking.payment_status]}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatBaisa(booking.total_price_baisa, booking.currency)}</TableCell>
                    <TableCell>{dateSummary(booking)}</TableCell>
                    <TableCell>{courtSummary(booking)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/bookings/${booking.id}`)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: stacked cards instead of a cramped, scrolling table. */}
          <div className="flex flex-col gap-3 md:hidden">
            {bookingsQuery.data.data.map((booking) => (
              <Card key={booking.id} className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-text">{booking.booking_reference}</p>
                  <Badge variant={BOOKING_STATUS_VARIANTS[booking.booking_status]}>{BOOKING_STATUS_LABELS[booking.booking_status]}</Badge>
                </div>
                <p className="text-sm text-text-muted">
                  {booking.customer_name ?? 'Guest'} &middot; {booking.customer_phone}
                </p>
                <p className="text-sm text-text">{dateSummary(booking)}</p>
                <p className="text-sm text-text-muted">Court: {courtSummary(booking)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text">{formatBaisa(booking.total_price_baisa, booking.currency)}</span>
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/bookings/${booking.id}`)}>
                    View Details
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={bookingsQuery.data.meta.current_page}
            totalPages={bookingsQuery.data.meta.last_page}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </>
      )}
    </Container>
  )
}
