import { useState } from 'react'
import type { ReactNode } from 'react'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioGroup } from '@/components/ui/RadioGroup'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table'
import { Pagination } from '@/components/ui/Pagination'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Skeleton, SkeletonText } from '@/components/ui/Skeleton'
import { useToast } from '@/hooks/useToast'
import type { ToastVariant } from '@/components/ui/toastContext'

/**
 * Internal-only "kitchen sink" of every shared component and design token
 * (Step 13). Not linked from any nav — reachable at /dev/showcase for
 * manual review. Storybook was not already configured for this project, so
 * this page is the lighter-weight alternative the spec explicitly allows.
 */
export function ShowcasePage() {
  return (
    <Container className="flex flex-col gap-16 py-12">
      <header>
        <h1 className="text-3xl font-semibold text-text">Design System Showcase</h1>
        <p className="mt-2 text-text-muted">
          Every shared token and component used by both the customer and admin interfaces.
        </p>
      </header>

      <ColorSection />
      <TypographySection />
      <SpacingSection />
      <RadiusAndShadowSection />
      <ButtonSection />
      <FormSection />
      <CardSection />
      <BadgeSection />
      <TableSection />
      <PaginationSection />
      <ModalSection />
      <ToastSection />
      <LoadingSection />
      <EmptyStateSection />
      <ErrorStateSection />
      <SkeletonSection />
    </Container>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`section-${title.toLowerCase().replace(/\s+/g, '-')}`} className="flex flex-col gap-4">
      <h2 id={`section-${title.toLowerCase().replace(/\s+/g, '-')}`} className="text-xl font-semibold text-text">
        {title}
      </h2>
      {children}
    </section>
  )
}

function ColorSection() {
  const swatches: Array<{ name: string; className: string }> = [
    { name: 'primary-50', className: 'bg-primary-50' },
    { name: 'primary-100', className: 'bg-primary-100' },
    { name: 'primary-300', className: 'bg-primary-300' },
    { name: 'primary-500', className: 'bg-primary-500' },
    { name: 'primary-600', className: 'bg-primary-600' },
    { name: 'primary-700', className: 'bg-primary-700' },
    { name: 'secondary-50', className: 'bg-secondary-50' },
    { name: 'secondary-100', className: 'bg-secondary-100' },
    { name: 'secondary-300', className: 'bg-secondary-300' },
    { name: 'secondary-500', className: 'bg-secondary-500' },
    { name: 'success', className: 'bg-success' },
    { name: 'warning', className: 'bg-warning' },
    { name: 'danger', className: 'bg-danger' },
    { name: 'info', className: 'bg-info' },
    { name: 'background', className: 'bg-background border border-border' },
    { name: 'surface', className: 'bg-surface border border-border' },
    { name: 'text', className: 'bg-text' },
    { name: 'text-muted', className: 'bg-text-muted' },
    { name: 'border', className: 'bg-border' },
  ]

  return (
    <Section title="Color Palette">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {swatches.map((swatch) => (
          <div key={swatch.name} className="flex flex-col gap-2">
            <div className={`h-16 rounded-control ${swatch.className}`} />
            <span className="text-xs text-text-muted">{swatch.name}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function TypographySection() {
  const sizes = ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'] as const

  return (
    <Section title="Typography">
      <div className="flex flex-col gap-3">
        {sizes.map((size) => (
          <p key={size} className={`${size} text-text`}>
            {size} — The quick brown fox jumps over the lazy dog
          </p>
        ))}
      </div>
    </Section>
  )
}

function SpacingSection() {
  const steps = [1, 2, 3, 4, 6, 8, 12, 16] as const

  return (
    <Section title="Spacing Scale">
      <div className="flex flex-wrap items-end gap-4">
        {steps.map((step) => (
          <div key={step} className="flex flex-col items-center gap-2">
            <div className={`w-4 bg-primary-300`} style={{ height: `${step * 0.25}rem` }} />
            <span className="text-xs text-text-muted">space-{step}</span>
          </div>
        ))}
      </div>
    </Section>
  )
}

function RadiusAndShadowSection() {
  return (
    <Section title="Border Radius & Shadows">
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-control bg-primary-100" />
          <span className="text-xs text-text-muted">radius-control</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-card bg-primary-100" />
          <span className="text-xs text-text-muted">radius-card</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-card bg-surface shadow-soft" />
          <span className="text-xs text-text-muted">shadow-soft</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-card bg-surface shadow-soft-lg" />
          <span className="text-xs text-text-muted">shadow-soft-lg</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="h-16 w-16 rounded-card bg-surface shadow-soft-xl" />
          <span className="text-xs text-text-muted">shadow-soft-xl</span>
        </div>
      </div>
    </Section>
  )
}

function ButtonSection() {
  return (
    <Section title="Buttons">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="primary" isLoading>
          Loading
        </Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    </Section>
  )
}

function FormSection() {
  const [textValue, setTextValue] = useState('')
  const [selectValue, setSelectValue] = useState('')
  const [radioValue, setRadioValue] = useState('pay_at_venue')
  const [checked, setChecked] = useState(false)

  return (
    <Section title="Form Inputs">
      <div className="grid gap-6 sm:grid-cols-2">
        <Input
          label="Phone number"
          placeholder="+968 9XXX XXXX"
          value={textValue}
          onChange={(event) => setTextValue(event.target.value)}
          required
          helperText="Omani mobile numbers only"
        />
        <Input label="Invalid example" defaultValue="not-an-email" error="Enter a valid email address" />
        <Select
          label="Payment method"
          placeholder="Choose a method"
          value={selectValue}
          onChange={(event) => setSelectValue(event.target.value)}
          options={[
            { value: 'pay_at_venue', label: 'Pay at Venue' },
            { value: 'thawani', label: 'Thawani (online)' },
          ]}
        />
        <Textarea label="Notes" placeholder="Optional notes for this booking" />
      </div>
      <div className="flex flex-col gap-4">
        <Checkbox label="I agree to the cancellation policy" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
        <RadioGroup
          legend="Payment method"
          value={radioValue}
          onChange={setRadioValue}
          options={[
            { value: 'pay_at_venue', label: 'Pay at Venue', description: 'Settle the balance when you arrive.' },
            { value: 'thawani', label: 'Thawani', description: 'Pay online now via Thawani.' },
          ]}
        />
      </div>
    </Section>
  )
}

function CardSection() {
  return (
    <Section title="Cards">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h3 className="text-base font-semibold text-text">Card title</h3>
          <p className="mt-1 text-sm text-text-muted">Cards are the base surface for grouped content.</p>
        </Card>
        <Card className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text">With an action</h3>
            <p className="mt-1 text-sm text-text-muted">Cards can hold any content, including buttons.</p>
          </div>
          <Button size="sm">Action</Button>
        </Card>
      </div>
    </Section>
  )
}

function BadgeSection() {
  const variants: BadgeVariant[] = ['neutral', 'success', 'warning', 'danger', 'info']

  return (
    <Section title="Badges & Status Indicators">
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <Badge variant="success">Confirmed</Badge>
        <Badge variant="warning">Pending Payment</Badge>
        <Badge variant="danger">Cancelled</Badge>
        <Badge variant="neutral">Expired</Badge>
      </div>
    </Section>
  )
}

function TableSection() {
  const rows = [
    { reference: 'BK-20260801-000123', status: 'Confirmed', method: 'Pay at Venue' },
    { reference: 'BK-20260801-000124', status: 'Pending Payment', method: 'Thawani' },
    { reference: 'BK-20260802-000125', status: 'Cancelled', method: 'Pay at Venue' },
  ]

  return (
    <Section title="Table">
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Reference</TableHeaderCell>
            <TableHeaderCell>Status</TableHeaderCell>
            <TableHeaderCell>Payment method</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.reference}>
              <TableCell>{row.reference}</TableCell>
              <TableCell>{row.status}</TableCell>
              <TableCell>{row.method}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  )
}

function PaginationSection() {
  const [page, setPage] = useState(3)

  return (
    <Section title="Pagination">
      <Pagination currentPage={page} totalPages={10} onPageChange={setPage} />
    </Section>
  )
}

function ModalSection() {
  const [open, setOpen] = useState(false)

  return (
    <Section title="Modal">
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel this booking?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep booking
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Cancel booking
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-muted">This releases all reserved slots. This cannot be undone.</p>
      </Modal>
    </Section>
  )
}

function ToastSection() {
  const { show } = useToast()
  const variants: ToastVariant[] = ['success', 'error', 'info', 'warning']

  return (
    <Section title="Toast Notifications">
      <div className="flex flex-wrap gap-3">
        {variants.map((variant) => (
          <Button
            key={variant}
            variant="secondary"
            onClick={() =>
              show({
                variant,
                title: `${variant[0].toUpperCase()}${variant.slice(1)} toast`,
                description: 'This is an example notification.',
              })
            }
          >
            Show {variant}
          </Button>
        ))}
      </div>
    </Section>
  )
}

function LoadingSection() {
  return (
    <Section title="Loading States">
      <div className="flex items-center gap-4">
        <LoadingSpinner />
        <Button isLoading>Saving</Button>
      </div>
    </Section>
  )
}

function EmptyStateSection() {
  return (
    <Section title="Empty States">
      <Card>
        <EmptyState
          title="No bookings yet"
          description="Bookings made by customers will appear here."
          action={<Button size="sm">Refresh</Button>}
        />
      </Card>
    </Section>
  )
}

function ErrorStateSection() {
  return (
    <Section title="Error States">
      <ErrorMessage message="We couldn't load this booking. Please check your link and try again." />
    </Section>
  )
}

function SkeletonSection() {
  return (
    <Section title="Skeleton Loaders">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-6 w-1/3" />
          <SkeletonText lines={3} />
        </div>
        <Skeleton className="h-24 w-24 shrink-0" />
      </div>
    </Section>
  )
}
