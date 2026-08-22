import { APP_NAME } from '@lockgo/shared'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="text-lg font-semibold text-slate-900">
          {APP_NAME}
        </Link>
        <div className="flex items-center gap-3">
          <NavLink
            to="/history"
            className={({ isActive }) =>
              `text-sm font-medium ${isActive ? 'text-indigo-600' : 'text-slate-600 hover:text-slate-900'}`
            }
          >
            ประวัติ
          </NavLink>
          <details className="relative">
            <summary className="cursor-pointer list-none text-sm font-medium text-slate-700">
              โปรไฟล์ ▾
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
              <button
                type="button"
                onClick={() => void signOut()}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
