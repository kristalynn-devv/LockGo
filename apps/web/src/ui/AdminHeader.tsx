import { APP_NAME } from '@lockgo/shared'
import { Link, useLocation } from 'react-router-dom'
import { ProfileMenu, ThemeButton } from './Header'
import { Icon, type IconName } from './icons'
import { shellPadClass, shellWidthClass } from './Page'

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin', label: 'สรุป', icon: 'grid' },
  { to: '/admin/stations', label: 'สถานี', icon: 'building' },
  { to: '/admin/reservations', label: 'การจอง', icon: 'calendar' },
  { to: '/admin/payments', label: 'การชำระเงิน', icon: 'card' },
  { to: '/admin/users', label: 'ผู้ใช้', icon: 'user' },
]

function isActive(pathname: string, to: string) {
  return to === '/admin' ? pathname === '/admin' : pathname.startsWith(to)
}

/**
 * แถบบน = ยี่ห้อ + โปรไฟล์ · แถบล่าง = เมนู
 * แยกสองแถบเพราะเมนูห้าอันเบียดกับโลโก้จนอ่านไม่ออกบนจอแคบ
 */
export function AdminHeader() {
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
            <ProfileMenu />
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
