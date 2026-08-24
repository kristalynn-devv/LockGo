import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { AdminFilterOption } from '../lib/adminFilterOptions'
import { MenuSelect } from './MenuSelect'
import { cardClass, fieldClass, secondaryButtonClass } from './Page'
import { Chip } from './states'

export function AdminFilterBar({
  children,
  active,
  onClear,
}: {
  children: ReactNode
  active?: boolean
  onClear?: () => void
}) {
  return (
    <div className={`${cardClass} mb-4 flex flex-wrap items-center gap-2 p-3`}>
      {children}
      {active && onClear ? (
        <button
          type="button"
          className="ml-auto shrink-0 text-xs font-medium text-accent-text hover:underline"
          onClick={onClear}
        >
          ล้างตัวกรอง
        </button>
      ) : null}
    </div>
  )
}

export function AdminFilterLabel({ children }: { children: ReactNode }) {
  return <span className="shrink-0 text-xs font-medium text-ink-muted">{children}</span>
}

export function AdminFilterChips({
  label,
  value,
  options,
  onChange,
}: {
  label?: string
  value: string
  options: readonly AdminFilterOption[]
  onChange: (value: string) => void
}) {
  return (
    <>
      {label ? <AdminFilterLabel>{label}</AdminFilterLabel> : null}
      {options.map((option) => (
        <Chip
          key={option.value || '__all__'}
          compact
          pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Chip>
      ))}
    </>
  )
}

export function AdminFilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly AdminFilterOption[]
  onChange: (value: string) => void
}) {
  return (
    <MenuSelect
      variant="pill"
      label={label}
      value={value}
      options={[...options]}
      marked={Boolean(value)}
      onChange={onChange}
    />
  )
}

export function AdminFilterSearch({
  paramValue,
  placeholder,
  onApply,
}: {
  paramValue: string
  placeholder: string
  onApply: (query: string) => void
}) {
  const [input, setInput] = useState(paramValue)

  useEffect(() => {
    setInput(paramValue)
  }, [paramValue])

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    onApply(input.trim())
  }

  return (
    <>
      <AdminFilterLabel>ค้นหา</AdminFilterLabel>
      <input
        className={`${fieldClass} h-9 min-h-0 min-w-[12rem] flex-1 sm:max-w-xs`}
        placeholder={placeholder}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submit()
        }}
      />
      <button type="button" className={`${secondaryButtonClass} h-9 min-h-0 px-3`} onClick={() => submit()}>
        ค้นหา
      </button>
    </>
  )
}
