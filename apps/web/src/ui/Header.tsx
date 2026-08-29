import { APP_NAME } from '@lockgo/shared'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useClickOutside } from '../lib/useClickOutside'
import { awaitingPayment, inUse, useReservationList } from '../lib/reservations'
import { useTheme } from '../lib/theme'
import { Icon, type IconName } from './icons'
import { secondaryButtonClass, shellPadClass, shellWidthClass } from './Page'

type TabMatch = 'home' | 'unpaid' | 'active' | 'history'

const TABS: {
  to: string | { pathname: string; search: string }
  label: string
  icon: IconName
  match: TabMatch
  badge?: 'due' | 'active'
}[] = [
  { to: '/', label: 'ค้นหา', icon: 'search', match: 'home' },
  {
    to: { pathname: '/history', search: '?status=unpaid' },
    label: 'รอชำระ',
    icon: 'lock',
    match: 'unpaid',
    badge: 'due',
  },
  {
    to: { pathname: '/history', search: '?status=Active' },
    label: 'ใช้งาน',
    icon: 'box',
    match: 'active',
    badge: 'active',
  },
  { to: '/history', label: 'ประวัติ', icon: 'clock', match: 'history' },
]

function initials(email?: string | null) {
  if (!email) return '?'
  return email.slice(0, 2).toUpperCase()
}

export function ThemeButton() {
  const { resolved, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolved === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}
      className="grid size-10 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
    >
      <Icon name={resolved === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}

function countTone(tone: 'warn' | 'ok') {
  return tone === 'ok' ? 'bg-ok text-surface' : 'bg-warn text-surface'
}

function CountBadge({ count, tone }: { count: number; tone: 'warn' | 'ok' }) {
  if (count <= 0) return null
  return (
    <span
      className={`ml-0.5 inline-grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold ${countTone(tone)}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

function IconCount({ count, tone }: { count: number; tone: 'warn' | 'ok' }) {
  if (count <= 0) return null
  return (
    <span
      className={`absolute -top-1.5 -right-2.5 z-10 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold leading-4 ${countTone(tone)}`}
    >
      {count > 9 ? '9+' : count}
    </span>
  )
}

function useTabMatch() {
  const { pathname, search } = useLocation()
  const status = new URLSearchParams(search).get('status')

  return (match: TabMatch) => {
    if (match === 'home') return pathname === '/'
    if (pathname !== '/history') return false
    if (match === 'unpaid') return status === 'unpaid'
    if (match === 'active') return status === 'Active'
    return !status || status === 'Completed' || status === 'Cancelled' || status === 'Expired'
  }
}

function useNavCounts() {
  const list = useReservationList(useAuth().session?.access_token ?? '').data?.items
  return {
    dueCount: awaitingPayment(list).length,
    activeCount: inUse(list).length,
  }
}

function tabBadge(tab: (typeof TABS)[number], dueCount: number, activeCount: number) {
  if (tab.badge === 'due') return { count: dueCount, tone: 'warn' as const }
  if (tab.badge === 'active') return { count: activeCount, tone: 'ok' as const }
  return null
}

export function ProfileMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const root = useClickOutside<HTMLDivElement>(open, setOpen)

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-label="เมนูโปรไฟล์"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="grid size-10 cursor-pointer place-items-center rounded-full border border-accent-line bg-accent-soft text-xs font-bold text-accent-text transition-colors hover:border-accent"
      >
        {initials(user?.email)}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-60 rounded-lg border border-line bg-surface p-3 shadow-sm">
          <p className="truncate text-xs text-ink-faint">{user?.email}</p>
          <button
            type="button"
            className={`${secondaryButtonClass} mt-2.5 w-full`}
            onClick={() => void signOut()}
          >
            ออกจากระบบ
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function Header() {
  const { user } = useAuth()
  const isMatch = useTabMatch()
  const { dueCount, activeCount } = useNavCounts()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div
        className={`mx-auto flex min-w-0 items-center justify-between gap-2 py-2.5 sm:gap-4 ${shellPadClass} ${shellWidthClass}`}
      >
        <Link
          to="/"
          className="flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.025em]"
        >
          <span className="grid size-7 place-items-center rounded-[9px] bg-accent text-accent-ink">
            <Icon name="lock" className="size-[15px]" />
          </span>
          {APP_NAME}
        </Link>

        <nav className="hidden items-center gap-0.5 md:flex">
          {TABS.map((item) => {
            const active = isMatch(item.match)
            const badge = tabBadge(item, dueCount, activeCount)
            return (
              <Link
                key={item.match}
                to={item.to}
                className={`flex items-center gap-2 rounded-ctl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-accent-soft font-semibold text-accent-text'
                    : 'font-medium text-ink-muted hover:bg-elevated hover:text-ink'
                }`}
              >
                <Icon name={item.icon} className="size-[15px]" />
                {item.label}
                {badge ? <CountBadge count={badge.count} tone={badge.tone} /> : null}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeButton />
          <span className="hidden max-w-40 truncate text-xs text-ink-faint md:inline">
            {user?.email}
          </span>
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}

/** แถบล่างสำหรับมือถือ — ซ่อนตั้งแต่ md ขึ้นไปเพราะย้ายไปอยู่บน header แล้ว */
export function TabBar() {
  const isMatch = useTabMatch()
  const { dueCount, activeCount } = useNavCounts()

  return (
    <nav className="flex gap-0.5 border-t border-line bg-surface/95 px-1.5 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
      {TABS.map((tab) => {
        const active = isMatch(tab.match)
        const badge = tabBadge(tab, dueCount, activeCount)
        return (
          <Link
            key={tab.match}
            to={tab.to}
            className={`grid min-h-11 min-w-0 flex-1 justify-items-center gap-0.5 rounded-lg py-1 text-[10px] font-semibold transition-colors ${
              active ? 'bg-accent-soft text-accent-text' : 'text-ink-faint hover:text-ink-muted'
            }`}
          >
            <span className="relative overflow-visible">
              <Icon name={tab.icon} />
              {badge ? <IconCount count={badge.count} tone={badge.tone} /> : null}
            </span>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
