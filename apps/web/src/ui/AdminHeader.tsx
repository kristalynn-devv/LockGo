import { APP_NAME } from '@lockgo/shared'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { ThemeButton } from './Header'
import { Icon, type IconName } from './icons'
import { secondaryButtonClass, shellPadClass, shellWidthClass } from './Page'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin', label: 'สรุป', icon: 'grid' },
  { to: '/admin/stations', label: 'สถานี', icon: 'building' },
  { to: '/admin/reservations', label: 'การจอง', icon: 'calendar' },
  { to: '/admin/payments', label: 'การชำระเงิน', icon: 'card' },
  { to: '/admin/users', label: 'ผู้ใช้', icon: 'user' },
]

function initials(email?: string | null) {
  if (!email) return '?'
  return email.slice(0, 2).toUpperCase()
}

function isActive(pathname: string, to: string) {
  return to === '/admin' ? pathname === '/admin' : pathname.startsWith(to)
}

/**
 * แถบบน = ยี่ห้อ + โปรไฟล์ · แถบล่าง = เมนู
 * แยกสองแถบเพราะเมนูห้าอันเบียดกับโลโก้จนอ่านไม่ออกบนจอแคบ
 */
export function AdminHeader() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 backdrop-blur-xl">
      <div className={`mx-auto min-w-0 ${shellPadClass} ${shellWidthClass}`}>
        <div className="flex min-w-0 items-center justify-between gap-2 py-2.5">
          <Link
            to="/admin"
            className="flex min-w-0 items-center gap-2.5 text-[17px] font-bold tracking-[-0.025em]"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-ink">
              <Icon name="lock" className="size-[15px]" />
            </span>
            <span className="truncate">
              {APP_NAME}
              <span className="text-ink-muted"> · ผู้ดูแลระบบ</span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5">
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

        <nav
          className="-mx-1 flex items-center gap-0.5 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="เมนูผู้ดูแลระบบ"
        >
          {TABS.map((item) => {
            const active = isActive(pathname, item.to)
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-ctl px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-accent-soft font-semibold text-accent-text'
                    : 'font-medium text-ink-muted hover:bg-elevated hover:text-ink'
                }`}
              >
                <Icon name={item.icon} className="size-[15px]" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
