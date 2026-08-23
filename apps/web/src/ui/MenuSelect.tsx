import { useEffect, useRef, useState } from 'react'
import { Icon } from './icons'
import { cardClass, fieldClass } from './Page'

export type MenuOption = { value: string; label: string }

export function MenuSelect({
  label,
  value,
  options,
  onChange,
  marked,
  variant = 'pill',
}: {
  label?: string
  value: string
  options: MenuOption[]
  onChange: (value: string) => void
  marked?: boolean
  variant?: 'pill' | 'field'
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)?.label ?? value

  useEffect(() => {
    if (!open) {
      return
    }
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const trigger =
    variant === 'field'
      ? `${fieldClass} flex cursor-pointer items-center justify-between gap-2 pr-3 text-left`
      : `inline-flex h-8 max-w-full items-center gap-1 rounded-full border pl-2.5 pr-2 text-xs ${
          marked
            ? 'border-accent bg-accent-soft text-accent-text'
            : 'border-line bg-surface text-ink'
        }`

  return (
    <div ref={root} className="relative min-w-0">
      <button
        type="button"
        aria-expanded={open}
        className={trigger}
        onClick={() => setOpen((current) => !current)}
      >
        {label && variant === 'pill' ? (
          <span className="shrink-0 text-ink-faint">{label}</span>
        ) : null}
        <span className="min-w-0 truncate font-medium">{selected}</span>
        <Icon name="chevron" className="size-3.5 shrink-0 text-ink-faint" />
      </button>
      {open ? (
        <ul
          className={`${cardClass} absolute z-30 mt-1 max-h-56 min-w-full overflow-auto py-1`}
          role="listbox"
        >
          {options.map((option) => {
            const active = option.value === value
            return (
              <li key={option.value || option.label}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`flex w-full px-3 py-2 text-left text-sm ${
                    active
                      ? 'bg-accent-soft font-medium text-accent-text'
                      : 'text-ink hover:bg-elevated'
                  }`}
                  onClick={() => {
                    onChange(option.value)
                    setOpen(false)
                  }}
                >
                  {option.label}
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
