import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import type { AdminBookingFilters as Filters, Court } from '@/types/admin'

interface AdminBookingFiltersProps {
  courts: Court[]
  filters: Filters
  onChange: (patch: Partial<Filters>) => void
  onClear: () => void
}

export function AdminBookingFilters({ courts, filters, onChange, onClear }: AdminBookingFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label={t('admin.bookings.filterCourt')}
        placeholder={t('admin.bookings.allCourts')}
        value={filters.court_id ? String(filters.court_id) : ''}
        onChange={(event) => onChange({ court_id: event.target.value ? Number(event.target.value) : undefined })}
        options={courts.map((court) => ({ value: String(court.id), label: court.name }))}
      />
      <Input
        label={t('admin.bookings.fromDate')}
        type="date"
        value={filters.date_from ?? ''}
        onChange={(event) => onChange({ date_from: event.target.value || undefined })}
      />
      <Input
        label={t('admin.bookings.toDate')}
        type="date"
        value={filters.date_to ?? ''}
        onChange={(event) => onChange({ date_to: event.target.value || undefined })}
      />
      <Select
        label={t('admin.bookings.status')}
        placeholder={t('admin.bookings.allStatuses')}
        value={filters.status ?? ''}
        onChange={(event) => onChange({ status: (event.target.value || undefined) as Filters['status'] })}
        options={[
          { value: 'pending_payment', label: t('admin.bookingStatus.pending_payment') },
          { value: 'confirmed', label: t('admin.bookingStatus.confirmed') },
          { value: 'cancelled', label: t('admin.bookingStatus.cancelled') },
          { value: 'expired', label: t('admin.bookingStatus.expired') },
        ]}
      />
      <Select
        label={t('admin.bookings.paymentMethod')}
        placeholder={t('admin.bookings.allMethods')}
        value={filters.payment_method ?? ''}
        onChange={(event) => onChange({ payment_method: (event.target.value || undefined) as Filters['payment_method'] })}
        options={[
          { value: 'pay_at_venue', label: t('admin.common.payAtVenue') },
          { value: 'thawani', label: t('admin.common.thawani') },
        ]}
      />
      <Select
        label={t('admin.bookings.paymentStatusFilter')}
        placeholder={t('admin.bookings.allPaymentStatuses')}
        value={filters.payment_status ?? ''}
        onChange={(event) => onChange({ payment_status: (event.target.value || undefined) as Filters['payment_status'] })}
        options={[
          { value: 'pending', label: t('admin.paymentStatus.pending') },
          { value: 'paid', label: t('admin.paymentStatus.paid') },
          { value: 'failed', label: t('admin.paymentStatus.failed') },
          { value: 'expired', label: t('admin.paymentStatus.expired') },
          { value: 'refunded', label: t('admin.paymentStatus.refunded') },
          { value: 'cancelled', label: t('admin.paymentStatus.cancelled') },
        ]}
      />
      <Input
        label={t('admin.bookings.customerPhone')}
        value={filters.phone ?? ''}
        onChange={(event) => onChange({ phone: event.target.value || undefined })}
      />
      <Input
        label={t('admin.bookings.bookingReference')}
        value={filters.reference ?? ''}
        onChange={(event) => onChange({ reference: event.target.value || undefined })}
      />
      <div className="flex items-end">
        <Button type="button" variant="secondary" onClick={onClear}>
          {t('admin.bookings.clearFilters')}
        </Button>
      </div>
    </div>
  )
}
