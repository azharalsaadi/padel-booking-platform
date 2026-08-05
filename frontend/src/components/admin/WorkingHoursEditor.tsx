import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/Checkbox'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { CourtWorkingHourEntry } from '@/types/admin'

const DAY_KEYS = ['day_0', 'day_1', 'day_2', 'day_3', 'day_4', 'day_5', 'day_6'] as const

interface DayRow {
  dayOfWeek: number
  enabled: boolean
  openTime: string
  closeTime: string
  error?: string
}

function buildInitialRows(workingHours: CourtWorkingHourEntry[]): DayRow[] {
  return DAY_KEYS.map((_, dayOfWeek) => {
    const existing = workingHours.find((entry) => entry.day_of_week === dayOfWeek)
    return {
      dayOfWeek,
      enabled: existing !== undefined,
      openTime: existing?.open_time ?? '09:00',
      closeTime: existing?.close_time ?? '21:00',
    }
  })
}

function rowsEqual(a: DayRow[], b: DayRow[]): boolean {
  return JSON.stringify(a.map(stripError)) === JSON.stringify(b.map(stripError))
}

function stripError({ error: _error, ...rest }: DayRow) {
  return rest
}

interface WorkingHoursEditorProps {
  workingHours: CourtWorkingHourEntry[]
  onSave: (workingHours: CourtWorkingHourEntry[]) => void
  isSaving: boolean
}

/**
 * A day with its checkbox off is submitted as "closed" (omitted entirely)
 * — mirrors the backend's convention exactly: no working_hours row for a
 * weekday means the court is closed that day.
 */
export function WorkingHoursEditor({ workingHours, onSave, isSaving }: WorkingHoursEditorProps) {
  const { t } = useTranslation()
  const [savedRows, setSavedRows] = useState<DayRow[]>(() => buildInitialRows(workingHours))
  const [rows, setRows] = useState<DayRow[]>(() => buildInitialRows(workingHours))

  // Re-baseline whenever the court's saved working hours change underneath us
  // (e.g. after a successful save, or if this court's data was refetched).
  useEffect(() => {
    const fresh = buildInitialRows(workingHours)
    setSavedRows(fresh)
    setRows(fresh)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(workingHours)])

  const isDirty = !rowsEqual(rows, savedRows)

  function updateRow(dayOfWeek: number, patch: Partial<DayRow>) {
    setRows((current) => current.map((row) => (row.dayOfWeek === dayOfWeek ? { ...row, ...patch, error: undefined } : row)))
  }

  function handleSave() {
    const validated = rows.map((row) => {
      if (row.enabled && row.closeTime <= row.openTime) {
        return { ...row, error: t('admin.workingHours.closeTimeError') }
      }
      return { ...row, error: undefined }
    })

    if (validated.some((row) => row.error)) {
      setRows(validated)
      return
    }

    const payload: CourtWorkingHourEntry[] = validated
      .filter((row) => row.enabled)
      .map((row) => ({ day_of_week: row.dayOfWeek, open_time: row.openTime, close_time: row.closeTime }))

    onSave(payload)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-text">{t('admin.workingHours.title')}</h2>
        {isDirty ? (
          <Badge variant="warning">{t('admin.workingHours.unsavedChanges')}</Badge>
        ) : (
          <Badge variant="success">{t('admin.workingHours.saved')}</Badge>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.dayOfWeek} className="flex flex-col gap-2 rounded-control border border-border p-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="sm:w-40">
              <Checkbox
                label={t(`admin.workingHours.${DAY_KEYS[row.dayOfWeek]}`)}
                checked={row.enabled}
                onChange={(event) => updateRow(row.dayOfWeek, { enabled: event.target.checked })}
              />
            </div>

            {row.enabled ? (
              <div className="flex flex-1 flex-wrap items-start gap-3">
                <label className="flex flex-col gap-1 text-sm text-text-muted">
                  {t('admin.workingHours.open')}
                  <input
                    type="time"
                    value={row.openTime}
                    onChange={(event) => updateRow(row.dayOfWeek, { openTime: event.target.value })}
                    className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-text"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm text-text-muted">
                  {t('admin.workingHours.close')}
                  <input
                    type="time"
                    value={row.closeTime}
                    onChange={(event) => updateRow(row.dayOfWeek, { closeTime: event.target.value })}
                    className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-text"
                  />
                </label>
                {row.error && (
                  <p role="alert" className="w-full text-sm text-danger">
                    {row.error}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-text-muted">{t('admin.workingHours.closed')}</p>
            )}
          </div>
        ))}
      </div>

      <div>
        <Button onClick={handleSave} isLoading={isSaving} disabled={!isDirty}>
          {t('admin.workingHours.saveButton')}
        </Button>
      </div>
    </div>
  )
}
