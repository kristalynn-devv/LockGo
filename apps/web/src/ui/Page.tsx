import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

/* --------------------------------------------------------------------------
   class ที่ใช้ซ้ำทั่วแอป — เก็บไว้ที่เดียวเพื่อให้ปุ่ม/ฟิลด์หน้าตาเหมือนกันหมด
   -------------------------------------------------------------------------- */
/** ขอบจอตามสเกล 8pt · ความกว้างเนื้อหา = xl (1280) */
export const shellPadClass = 'px-4 sm:px-6 lg:px-8'
export const shellWidthClass = 'w-full max-w-7xl'

/** 1 คอลัมน์มือถือ · 2 แท็บเล็ต · 3 เดสก์ท็อป */
export const cardGridClass = 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3'

export const stickyRailClass = 'min-w-0 lg:sticky lg:top-16'

/** โครง 12 คอลัมน์ — เนื้อหา 8 / แถบข้าง 4 ตั้งแต่ lg */
export const splitGridClass = 'grid grid-cols-1 items-start gap-4 lg:grid-cols-12 lg:gap-6'

export const cardClass =
  'rounded-card border border-line bg-surface shadow-card'

export const fieldClass =
  'min-h-11 w-full rounded-ctl border border-line-strong bg-surface px-3 py-2.5 text-sm text-ink transition-colors hover:border-accent-line focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent/35'

export const primaryButtonClass =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-accent-ink hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-elevated disabled:text-ink-faint'

export const secondaryButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50'

export const linkButtonClass =
  'inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-accent-text hover:underline'

export const labelClass =
  'text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint'

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
      className={`mx-auto flex-1 py-4 sm:py-6 ${shellPadClass} ${
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

const FooterSlotContext = createContext<HTMLElement | null>(null)

/** แถบล่างของแอป — ActionBar กับ TabBar ซ้อนกันเอง ไม่ต้องเดาความสูง */
export function FooterDock({ children }: { children: ReactNode }) {
  const slotRef = useRef<HTMLDivElement>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setSlot(slotRef.current)
  }, [])

  return (
    <FooterSlotContext.Provider value={slot}>
      <div className="sticky bottom-0 z-20">
        <div ref={slotRef} />
        {children}
      </div>
    </FooterSlotContext.Provider>
  )
}

/** แถบสรุป+ปุ่มหลักบนมือถือ/แท็บเล็ต — lg ขึ้นไปใช้ปุ่มในการ์ดฝั่งขวาแทน */
export function ActionBar({ children }: { children: ReactNode }) {
  const slot = useContext(FooterSlotContext)
  const bar = (
    <div
      className={`flex items-center gap-3 border-t border-line bg-surface/95 py-2.5 md:pb-[calc(0.625rem+env(safe-area-inset-bottom))] lg:hidden ${shellPadClass}`}
    >
      {children}
    </div>
  )
  if (!slot) return null
  return createPortal(bar, slot)
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className={labelClass}>{children}</p>
}
