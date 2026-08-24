import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'
import { cardClass, dangerButtonClass, primaryButtonClass, secondaryButtonClass } from './Page'

/* --------------------------------------------------------------------------
   ยืนยันการลบ - แทน window.confirm ที่หน้าตาไม่ตรงกับแอปและอ่านยากบนมือถือ
   -------------------------------------------------------------------------- */

export type ConfirmOptions = {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

export function useConfirm(): {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  dialog: ReactNode
} {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolveRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback(
    (next: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        resolveRef.current = resolve
        setOptions(next)
      }),
    [],
  )

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value)
    resolveRef.current = null
    setOptions(null)
  }, [])

  const dialog = options ? <ConfirmDialog options={options} onSettle={settle} /> : null

  return { confirm, dialog }
}

function ConfirmDialog({
  options,
  onSettle,
}: {
  options: ConfirmOptions
  onSettle: (value: boolean) => void
}) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    confirmRef.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onSettle(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onSettle])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onSettle(false)
      }}
    >
      <div className={`${cardClass} w-full max-w-sm p-5 shadow-lift`} role="alertdialog" aria-modal="true">
        <div className="flex items-start gap-3">
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-lg ${
              options.danger ? 'bg-danger-soft text-danger' : 'bg-warn-soft text-warn'
            }`}
          >
            <Icon name="alert" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{options.title}</h2>
            {options.message ? (
              <p className="mt-1 text-sm text-ink-muted">{options.message}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={secondaryButtonClass} onClick={() => onSettle(false)}>
            ยกเลิก
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={`${options.danger ? dangerButtonClass : primaryButtonClass} w-auto min-w-24`}
            onClick={() => onSettle(true)}
          >
            {options.confirmLabel ?? 'ยืนยัน'}
          </button>
        </div>
      </div>
    </div>
  )
}
