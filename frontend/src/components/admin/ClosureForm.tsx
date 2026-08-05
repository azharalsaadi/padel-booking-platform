import { useState } from 'react'
import type { FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/Checkbox'
import { RadioGroup } from '@/components/ui/RadioGroup'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { ClosureDatesMode, Court, CreateClosurePayload } from '@/types/admin'

interface ClosureFormProps {
  courts: Court[]
  onSubmit: (payload: CreateClosurePayload) => void
  isSubmitting: boolean
  error?: string | null
}

export function ClosureForm({ courts, onSubmit, isSubmitting, error }: ClosureFormProps) {
  const { t } = useTranslation()
  const [scope, setScope] = useState<'all' | 'specific'>('all')
  const [selectedCourtIds, setSelectedCourtIds] = useState<number[]>([])

  const [datesMode, setDatesMode] = useState<ClosureDatesMode>('single')
  const [singleDate, setSingleDate] = useState('')
  const [multipleDates, setMultipleDates] = useState<string[]>([''])
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')

  const [isFullDay, setIsFullDay] = useState(true)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('21:00')

  const [reason, setReason] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  function toggleCourt(courtId: number) {
    setSelectedCourtIds((current) =>
      current.includes(courtId) ? current.filter((id) => id !== courtId) : [...current, courtId],
    )
  }

  function updateMultipleDate(index: number, value: string) {
    setMultipleDates((current) => current.map((date, i) => (i === index ? value : date)))
  }

  function addDateField() {
    setMultipleDates((current) => [...current, ''])
  }

  function removeDateField(index: number) {
    setMultipleDates((current) => current.filter((_, i) => i !== index))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setValidationError(null)

    if (scope === 'specific' && selectedCourtIds.length === 0) {
      setValidationError(t('admin.closures.selectAtLeastOneCourtError'))
      return
    }

    if (!isFullDay && endTime <= startTime) {
      setValidationError(t('admin.closures.closureEndAfterStartError'))
      return
    }

    let dates: CreateClosurePayload['dates']
    if (datesMode === 'single') {
      if (!singleDate) {
        setValidationError(t('admin.closures.chooseDateError'))
        return
      }
      dates = { mode: 'single', values: [singleDate] }
    } else if (datesMode === 'multiple') {
      const values = multipleDates.filter((date) => date !== '')
      if (values.length === 0) {
        setValidationError(t('admin.closures.addAtLeastOneDateError'))
        return
      }
      dates = { mode: 'multiple', values }
    } else {
      if (!rangeStart || !rangeEnd) {
        setValidationError(t('admin.closures.chooseRangeError'))
        return
      }
      if (rangeEnd < rangeStart) {
        setValidationError(t('admin.closures.rangeEndError'))
        return
      }
      dates = { mode: 'range', range: { start: rangeStart, end: rangeEnd } }
    }

    onSubmit({
      court_ids: scope === 'all' ? null : selectedCourtIds,
      dates,
      is_full_day: isFullDay,
      start_time: isFullDay ? null : startTime,
      end_time: isFullDay ? null : endTime,
      reason: reason.trim() || null,
    })
  }

  return (
    <form className="flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
      <RadioGroup
        legend={t('admin.closures.courtsLegend')}
        value={scope}
        onChange={(value) => setScope(value as 'all' | 'specific')}
        options={[
          { value: 'all', label: t('admin.closures.allCourtsOption'), description: t('admin.closures.allCourtsDescription') },
          { value: 'specific', label: t('admin.closures.specificCourts') },
        ]}
      />

      {scope === 'specific' && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium text-text">{t('admin.closures.selectCourtsLegend')}</legend>
          {courts.map((court) => (
            <Checkbox
              key={court.id}
              label={court.name}
              checked={selectedCourtIds.includes(court.id)}
              onChange={() => toggleCourt(court.id)}
            />
          ))}
        </fieldset>
      )}

      <RadioGroup
        legend={t('admin.closures.datesLegend')}
        value={datesMode}
        onChange={(value) => setDatesMode(value as ClosureDatesMode)}
        options={[
          { value: 'single', label: t('admin.closures.oneDate') },
          { value: 'multiple', label: t('admin.closures.multipleDates'), description: t('admin.closures.multipleDatesDescription') },
          { value: 'range', label: t('admin.closures.dateRange') },
        ]}
      />

      {datesMode === 'single' && (
        <Input label={t('admin.closures.date')} type="date" value={singleDate} onChange={(event) => setSingleDate(event.target.value)} />
      )}

      {datesMode === 'multiple' && (
        <div className="flex flex-col gap-2">
          {multipleDates.map((date, index) => (
            <div key={index} className="flex items-end gap-2">
              <Input
                label={t('admin.closures.dateN', { n: index + 1 })}
                hideLabel
                type="date"
                value={date}
                onChange={(event) => updateMultipleDate(index, event.target.value)}
              />
              {multipleDates.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeDateField(index)}>
                  {t('admin.closures.remove')}
                </Button>
              )}
            </div>
          ))}
          <div>
            <Button type="button" variant="secondary" size="sm" onClick={addDateField}>
              {t('admin.closures.addAnotherDate')}
            </Button>
          </div>
        </div>
      )}

      {datesMode === 'range' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label={t('admin.closures.startDate')} type="date" value={rangeStart} onChange={(event) => setRangeStart(event.target.value)} />
          <Input label={t('admin.closures.endDate')} type="date" value={rangeEnd} onChange={(event) => setRangeEnd(event.target.value)} />
        </div>
      )}

      <Checkbox label={t('admin.closures.fullDayClosure')} checked={isFullDay} onChange={(event) => setIsFullDay(event.target.checked)} />

      {!isFullDay && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
            {t('admin.closures.startTime')}
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
              className="rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-text"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
            {t('admin.closures.endTime')}
            <input
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              className="rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-text"
            />
          </label>
        </div>
      )}

      <Input label={t('admin.closures.reasonOptional')} value={reason} onChange={(event) => setReason(event.target.value)} />

      {(validationError || error) && <ErrorMessage message={validationError ?? error ?? ''} />}

      <div>
        <Button type="submit" isLoading={isSubmitting}>
          {t('admin.closures.createClosure')}
        </Button>
      </div>
    </form>
  )
}
