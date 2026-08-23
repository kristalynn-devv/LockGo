import type { ReactNode } from 'react'
import { Icon, type IconName } from './icons'
import { cardClass, cardGridClass, primaryButtonClass, secondaryButtonClass } from './Page'

/** โครงกระดูกที่มีสัดส่วนเหมือนการ์ดจริง - ไม่ใช่กล่องเทาลอย ๆ */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`${cardClass} p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="shimmer h-4 w-1/2 rounded bg-elevated" />
        <div className="shimmer ml-auto h-5 w-14 rounded-full bg-elevated" />
      </div>
      <div className="shimmer mt-3 h-3 w-3/4 rounded bg-elevated" />
      <div className="mt-4 flex gap-1.5">
        <div className="shimmer h-6 w-12 rounded-full bg-elevated" />
        <div className="shimmer h-6 w-12 rounded-full bg-elevated" />
        <div className="shimmer h-6 w-12 rounded-full bg-elevated" />
      </div>
      <div className="mt-5 flex items-center">
        <div className="shimmer h-6 w-16 rounded bg-elevated" />
        <div className="shimmer ml-auto h-3.5 w-14 rounded bg-elevated" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className={cardGridClass}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} />
      ))}
    </div>
  )
}

/** ว่างเปล่า = บอกทางออก ไม่ใช่แค่บอกว่าไม่เจอ */
export function EmptyState({
  message,
  hint,
  icon = 'inbox',
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  message: string
  hint?: string
  icon?: IconName
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondary?: () => void
}) {
  return (
    <div className="rounded-lg border border-dashed border-line p-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-lg bg-accent-soft text-accent-text">
        <Icon name={icon} className="size-7" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{message}</h3>
      {hint ? <p className="mt-2 text-sm text-ink-muted">{hint}</p> : null}
      {actionLabel || secondaryLabel ? (
        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          {secondaryLabel && onSecondary ? (
            <button type="button" className={secondaryButtonClass} onClick={onSecondary}>
              {secondaryLabel}
            </button>
          ) : null}
          {actionLabel && onAction ? (
            <button
              type="button"
              className={`${primaryButtonClass} w-auto min-w-28`}
              onClick={onAction}
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({
  message,
  hint,
  onRetry,
  children,
}: {
  message: string
  hint?: string
  onRetry?: () => void
  children?: ReactNode
}) {
  return (
    <div className={`${cardClass} border-danger/40 bg-danger-soft p-4`}>
      <div className="mx-auto grid size-10 place-items-center rounded-full bg-surface text-danger">
        <Icon name="offline" className="size-5" />
      </div>
      <h3 className="mt-3 text-center text-lg font-semibold">{message}</h3>
      {hint ? <p className="mt-1 text-center text-sm text-ink-muted">{hint}</p> : null}
      {onRetry ? (
        <button
          type="button"
          className={`${primaryButtonClass} mx-auto mt-3 w-auto min-w-28`}
          onClick={onRetry}
        >
          ลองใหม่
        </button>
      ) : null}
      {children}
    </div>
  )
}

/** เตือนแบบไม่น่ากลัว - ใช้ตอนจองชนกัน (409) */
export function NoticeCard({
  title,
  message,
  children,
}: {
  title: string
  message?: string
  children?: ReactNode
}) {
  return (
    <div className={`${cardClass} border-warn/50 p-4`}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-warn-soft text-warn">
          <Icon name="alert" />
        </span>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold">{title}</h3>
          {message ? <p className="mt-1 text-sm text-ink-muted">{message}</p> : null}
        </div>
      </div>
      {children ? <div className="mt-3.5 flex flex-wrap gap-2.5">{children}</div> : null}
    </div>
  )
}

export function Badge({ children, tone }: { children: ReactNode; tone: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tone}`}
    >
      {children}
    </span>
  )
}

/** สวิตช์/ตัวกรองแบบชิป - ไม่ใช่ดรอปดาวน์ */
export function Chip({
  pressed,
  onClick,
  children,
  compact,
  switchRole,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  compact?: boolean
  switchRole?: boolean
}) {
  return (
    <button
      type="button"
      role={switchRole ? 'switch' : undefined}
      aria-checked={switchRole ? pressed : undefined}
      aria-pressed={switchRole ? undefined : pressed}
      onClick={onClick}
      className={`rounded-full border ${
        compact
          ? 'inline-flex h-8 items-center px-2.5 text-xs'
          : 'min-h-11 px-3 text-sm'
      } ${
        pressed
          ? 'border-accent bg-accent-soft font-medium text-accent-text'
          : `${compact ? 'border-line' : 'border-line-strong'} bg-surface text-ink-muted hover:bg-elevated`
      }`}
    >
      {children}
    </button>
  )
}

/** ตรวจฟอร์ม - ไม่ใช้ ErrorState ที่เป็นการ์ดโหลดไม่สำเร็จ */
export function FormError({ message }: { message: string }) {
  return (
    <p
      className="rounded-lg border border-danger/40 bg-danger-soft/60 px-3 py-2 text-sm text-danger"
      role="alert"
    >
      {message}
    </p>
  )
}
