import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

/* --------------------------------------------------------------------------
   class ที่ใช้ซ้ำทั่วแอป - เก็บไว้ที่เดียวเพื่อให้ปุ่ม/ฟิลด์หน้าตาเหมือนกันหมด
   -------------------------------------------------------------------------- */
/** ขอบจอตามสเกล 8pt · ความกว้างเนื้อหา = xl (1280) */
export const shellPadClass = 'px-4 sm:px-6 lg:px-8'
export const shellWidthClass = 'w-full max-w-7xl'

/** 1 คอลัมน์มือถือ · 2 แท็บเล็ต · 3 เดสก์ท็อป */
export const cardGridClass = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

export const stickyRailClass = 'min-w-0 lg:sticky lg:top-16'

/** โครง 12 คอลัมน์ - เนื้อหา 8 / แถบข้าง 4 ตั้งแต่ lg */
export const splitGridClass = 'grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6'

export const cardClass =
  'min-w-0 rounded-card border border-line bg-surface shadow-card'

/** พื้นที่กดของการ์ดรายการ - ทั้งใบเป็นเป้า ไม่ใช่แค่ข้อความมุมขวา */
export const cardHitClass = 'block p-4 hover:bg-elevated'

export const fieldClass =
  'min-h-11 w-full min-w-0 max-w-full rounded-lg border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink hover:border-accent-line focus:border-accent focus:outline-none'

export const primaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-elevated disabled:text-ink-faint'

export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50'

export const linkButtonClass =
  'inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-accent-text hover:underline'

/** แอคชันทำลาย - เป้าครบแต่ไม่แย่งปุ่มหลัก */
export const quietButtonClass =
  'inline-flex min-h-10 items-center text-sm text-ink-muted hover:text-danger disabled:cursor-not-allowed disabled:opacity-50'

export const labelClass =
  'text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint'

/** ป้ายอยู่นอกเป้ากด — ห้ามห่อ DateField / MenuSelect ด้วย <label> */
export function Field({
  label,
  hint,
  className = '',
  children,
}: {
  label: string
  hint?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className={labelClass}>{label}</p>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-2 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  )
}

/** คอนเทนเนอร์หลักของทุกหน้า */
export function Page({
  title,
  action,
  children,
  wide = false,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <main
      className={`mx-auto min-w-0 flex-1 py-4 sm:py-6 ${shellPadClass} ${
        wide ? shellWidthClass : 'w-full max-w-3xl'
      }`}
    >
      {title || action ? (
        <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
          {title ? (
            <h1 className="min-w-0 text-[23px] font-bold tracking-[-0.02em] sm:text-[26px]">
              {title}
            </h1>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {children}
    </main>
  )
}

/** มือถือ = ซ้อนกัน · ตั้งแต่ lg = สองคอลัมน์ ฝั่งขวาเลื่อนตาม */
export function SplitLayout({
  main,
  aside,
}: {
  main: ReactNode
  aside: ReactNode
}) {
  return (
    <div className={splitGridClass}>
      <div className="min-w-0 lg:col-span-8">{main}</div>
      <aside className={`${stickyRailClass} lg:col-span-4`}>{aside}</aside>
    </div>
  )
}

type FooterSlotValue = {
  slot: HTMLElement | null
  setSlot: (node: HTMLElement | null) => void
}

const FooterSlotContext = createContext<FooterSlotValue | null>(null)

/** ครอบทั้งหน้า - ActionBar อยู่ใน Outlet นอก FooterDock ต้องเห็น slot เดียวกัน */
export function FooterSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const value = useMemo(() => ({ slot, setSlot }), [slot])
  return <FooterSlotContext.Provider value={value}>{children}</FooterSlotContext.Provider>
}

/** แถบล่างของแอป - ActionBar กับ TabBar ซ้อนกันเอง ไม่ต้องเดาความสูง */
export function FooterDock({ children }: { children: ReactNode }) {
  const setSlot = useContext(FooterSlotContext)?.setSlot
  const slotRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    setSlot?.(slotRef.current)
    return () => setSlot?.(null)
  }, [setSlot])

  return (
    <div className="sticky bottom-0 z-20">
      <div ref={slotRef} />
      {children}
    </div>
  )
}

/** แถบสรุป+ปุ่มหลักบนมือถือ/แท็บเล็ต - lg ขึ้นไปใช้ปุ่มในการ์ดฝั่งขวาแทน */
export function ActionBar({ children }: { children: ReactNode }) {
  const slot = useContext(FooterSlotContext)?.slot ?? null
  const bar = (
    <div
      className={`flex items-center justify-between gap-3 border-t border-line bg-surface/95 py-2.5 md:pb-[calc(0.625rem+env(safe-area-inset-bottom))] lg:hidden ${shellPadClass}`}
    >
      {children}
    </div>
  )
  if (!slot) return bar
  return createPortal(bar, slot)
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={labelClass}>{children}</p>
}
