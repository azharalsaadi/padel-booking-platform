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
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Select
        label="Court"
        placeholder="All courts"
        value={filters.court_id ? String(filters.court_id) : ''}
        onChange={(event) => onChange({ court_id: event.target.value ? Number(event.target.value) : undefined })}
        options={courts.map((court) => ({ value: String(court.id), label: court.name }))}
      />
      <Input
        label="From date"
        type="date"
        value={filters.date_from ?? ''}
        onChange={(event) => onChange({ date_from: event.target.value || undefined })}
      />
      <Input
        label="To date"
        type="date"
        value={filters.date_to ?? ''}
        onChange={(event) => onChange({ date_to: event.target.value || undefined })}
      />
      <Select
        label="Status"
        placeholder="All statuses"
        value={filters.status ?? ''}
        onChange={(event) => onChange({ status: (event.target.value || undefined) as Filters['status'] })}
        options={[
          { value: 'pending_payment', label: 'Pending Payment' },
          { value: 'confirmed', label: 'Confirmed' },
          { value: 'cancelled', label: 'Cancelled' },
          { value: 'expired', label: 'Expired' },
        ]}
      />
      <Select
        label="Payment method"
        placeholder="All methods"
        value={filters.payment_method ?? ''}
        onChange={(event) => onChange({ payment_method: (event.target.value || undefined) as Filters['payment_method'] })}
        options={[
          { value: 'pay_at_venue', label: 'Pay at Venue' },
          { value: 'thawani', label: 'Thawani' },
        ]}
      />
      <Input
        label="Customer phone"
        value={filters.phone ?? ''}
        onChange={(event) => onChange({ phone: event.target.value || undefined })}
      />
      <Input
        label="Booking reference"
        value={filters.reference ?? ''}
        onChange={(event) => onChange({ reference: event.target.value || undefined })}
      />
      <div className="flex items-end">
        <Button type="button" variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    </div>
  )
}
