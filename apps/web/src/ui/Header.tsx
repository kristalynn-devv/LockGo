import { APP_NAME } from '@lockgo/shared'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/theme'
import { Icon, type IconName } from './icons'
import { secondaryButtonClass, shellPadClass, shellWidthClass } from './Page'

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'ค้นหา', icon: 'search' },
  { to: '/history', label: 'ประวัติ', icon: 'clock' },
]

function initials(email?: string | null) {
  if (!email) return '?'
  return email.slice(0, 2).toUpperCase()
}

function ThemeButton() {
  const { resolved, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={resolved === 'dark' ? 'สลับเป็นธีมสว่าง' : 'สลับเป็นธีมมืด'}
      className="grid size-[34px] place-items-center rounded-ctl text-ink-muted transition-colors hover:bg-elevated hover:text-ink"
    >
      <Icon name={resolved === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}

export function Header() {
  const { user, signOut } = useAuth()

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
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-ctl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-accent-soft font-semibold text-accent-text'
                    : 'font-medium text-ink-muted hover:bg-elevated hover:text-ink'
                }`
              }
            >
              <Icon name={item.icon} className="size-[15px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeButton />
          <span className="hidden max-w-40 truncate text-xs text-ink-faint md:inline">
            {user?.email}
          </span>
          <details className="group relative">
            <summary
              className="grid size-[34px] cursor-pointer list-none place-items-center rounded-full border border-accent-line bg-accent-soft text-xs font-bold text-accent-text transition-colors hover:border-accent"
              aria-label="เมนูโปรไฟล์"
            >
              {initials(user?.email)}
            </summary>
            <div className="absolute right-0 z-30 mt-2 w-60 rounded-card border border-line bg-surface p-3 shadow-lift">
              <p className="truncate text-xs text-ink-faint">{user?.email}</p>
              <button
                type="button"
                onClick={() => void signOut()}
                className={`${secondaryButtonClass} mt-2.5 w-full`}
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

/** แถบล่างสำหรับมือถือ — ซ่อนตั้งแต่ md ขึ้นไปเพราะย้ายไปอยู่บน header แล้ว */
export function TabBar() {
  return (
    <nav className="flex gap-1 border-t border-line bg-surface/95 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
      {NAV.map((tab) => (
        <NavLink
          key={tab.label}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `grid min-h-13 flex-1 justify-items-center gap-1 rounded-ctl py-1.5 text-[10.5px] font-semibold transition-colors ${
              isActive ? 'bg-accent-soft text-accent-text' : 'text-ink-faint hover:text-ink-muted'
            }`
          }
        >
          <Icon name={tab.icon} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
