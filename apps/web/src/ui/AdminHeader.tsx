import { APP_NAME } from '@lockgo/shared'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Icon, type IconName } from './icons'
import { secondaryButtonClass, shellPadClass, shellWidthClass } from './Page'
import { ThemeButton } from './Header'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin', label: 'สรุป', icon: 'grid' },
  { to: '/admin/stations', label: 'สถานี', icon: 'building' },
  { to: '/admin/reservations', label: 'การจอง', icon: 'calendar' },
  { to: '/admin/payments', label: 'การชำระเงิน', icon: 'card' },
]

function initials(email?: string | null) {
  if (!email) return '?'
  return email.slice(0, 2).toUpperCase()
}

export function AdminHeader() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div
        className={`mx-auto flex min-w-0 items-center justify-between gap-2 py-2.5 sm:gap-4 ${shellPadClass} ${shellWidthClass}`}
      >
        <Link
          to="/admin"
          className="flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.025em]"
        >
          <span className="grid size-7 place-items-center rounded-[9px] bg-accent text-accent-ink">
            <Icon name="lock" className="size-[15px]" />
          </span>
          {APP_NAME} · ผู้ดูแลระบบ
        </Link>

        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {TABS.map((item) => {
            const active = item.to === '/admin' ? pathname === '/admin' : pathname.startsWith(item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-2 rounded-ctl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-accent-soft font-semibold text-accent-text'
                    : 'font-medium text-ink-muted hover:bg-elevated hover:text-ink'
                }`}
              >
                <Icon name={item.icon} className="size-[15px]" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeButton />
          <details className="group relative">
            <summary
              className="grid size-10 cursor-pointer list-none place-items-center rounded-full border border-accent-line bg-accent-soft text-xs font-bold text-accent-text transition-colors hover:border-accent"
              aria-label="เมนูโปรไฟล์"
            >
              {initials(user?.email)}
            </summary>
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
          </details>
        </div>
      </div>
    </header>
  )
}
