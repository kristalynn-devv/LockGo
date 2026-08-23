import { useEffect, useMemo, useRef, useState } from 'react'
import { combineLocal, toDateInput } from '../lib/format'
import { Icon } from './icons'
import { cardClass, fieldClass } from './Page'

const WEEKDAYS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function monthLabel(cursor: Date) {
  return new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' }).format(cursor)
}

function formatThaiDate(value: string) {
  return new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' }).format(
    combineLocal(value, '00:00'),
  )
}

export function DateField({
  value,
  min,
  max,
  onChange,
  unavailable,
  ariaLabel = 'วันที่',
}: {
  value: string
  min: string
  max: string
  onChange: (value: string) => void
  unavailable?: (iso: string) => boolean
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(() => parseDate(value))
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setCursor(parseDate(value))
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, value])

  const cells = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const pad = (start.getDay() + 6) % 7
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const items: { key: string; day?: number; iso?: string }[] = []
    for (let i = 0; i < pad; i += 1) {
      items.push({ key: `pad-${i}` })
    }
    for (let day = 1; day <= last; day += 1) {
      const iso = toDateInput(new Date(cursor.getFullYear(), cursor.getMonth(), day))
      items.push({ key: iso, day, iso })
    }
    return items
  }, [cursor])

  const today = toDateInput(new Date())

  return (
    <div ref={root} className="relative w-full min-w-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`${fieldClass} flex items-center justify-between gap-2 text-left`}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{formatThaiDate(value)}</span>
        <Icon name="calendar" className="size-4 text-ink-faint" />
      </button>
      {open ? (
        <div className={`${cardClass} absolute z-30 mt-1 w-[17.5rem] p-3`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              aria-label="เดือนก่อน"
              className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-elevated"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
              }
            >
              <Icon name="back" className="size-4" />
            </button>
            <p className="text-sm font-semibold">{monthLabel(cursor)}</p>
            <button
              type="button"
              aria-label="เดือนถัดไป"
              className="grid size-10 place-items-center rounded-lg text-ink-muted hover:bg-elevated"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
              }
            >
              <Icon name="arrow" className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] text-ink-faint">
            {WEEKDAYS.map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
            {cells.map((cell) => {
              if (!cell.iso || cell.day == null) {
                return <span key={cell.key} />
              }
              const iso = cell.iso
              const booked = Boolean(unavailable?.(iso))
              const disabled = iso < min || iso > max || booked
              const selected = iso === value
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={disabled}
                  aria-label={booked ? `${cell.day} ถูกจองครบแล้ว` : undefined}
                  className={`h-8 rounded-lg text-sm ${
                    selected
                      ? 'bg-accent font-semibold text-accent-ink'
                      : disabled
                        ? 'text-ink-faint'
                        : 'text-ink hover:bg-accent-soft hover:text-accent-text'
                  }`}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>
          {today >= min && today <= max && !unavailable?.(today) ? (
            <button
              type="button"
              className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-lg text-xs font-medium text-accent-text hover:bg-accent-soft"
              onClick={() => {
                onChange(today)
                setOpen(false)
              }}
            >
              วันนี้
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
