import { APP_NAME } from '@lockgo/shared'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { authErrorMessage } from '../lib/format'
import { Icon } from '../ui/icons'
import {
  cardClass,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/Page'
import { ErrorState } from '../ui/states'

const POINTS = [
  'ดูจำนวนช่องว่างแบบเรียลไทม์ทุกสถานี',
  'จองล่วงหน้าได้ถึง 7 วัน ครั้งละ 1–24 ชั่วโมง',
  'กันจองซ้อน 0% ด้วยการล็อกช่องระดับฐานข้อมูล',
]

export function LoginPage() {
  const { session, loading, signIn, signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!loading && session) {
    return <Navigate to="/" replace />
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setPending(true)
    try {
      await signIn(email.trim(), password)
    } catch (caught) {
      setError(authErrorMessage(caught instanceof Error ? caught.message : ''))
    } finally {
      setPending(false)
    }
  }

  async function onGoogle() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (caught) {
      setError(authErrorMessage(caught instanceof Error ? caught.message : ''))
    }
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* แผงแบรนด์: โผล่เฉพาะจอ lg ขึ้นไป */}
      <div className="hidden flex-col justify-between bg-accent-panel p-10 text-accent-panel-ink lg:flex">
        <span className="flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.025em]">
          <span className="grid size-7 place-items-center rounded-[9px] bg-white/15">
            <Icon name="lock" className="size-[15px]" />
          </span>
          {APP_NAME}
        </span>

        <div>
          <h2 className="text-[30px] leading-tight font-bold tracking-[-0.03em]">
            หาตู้ล็อกเกอร์ว่าง
            <br />
            แล้วจองไว้ล่วงหน้า
          </h2>
          <ul className="mt-7 grid gap-3">
            {POINTS.map((point, index) => (
              <li key={point} className="flex items-start gap-2.5 text-sm opacity-90">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-white/15 text-[11px] font-bold">
                  {index + 1}
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs opacity-70">© 2026 {APP_NAME}</p>
      </div>

      <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:p-10">
        <div className="w-full max-w-sm">
          <span className="mb-4 flex items-center gap-2.5 text-[17px] font-bold tracking-[-0.025em] lg:hidden">
            <span className="grid size-7 place-items-center rounded-[9px] bg-accent text-accent-ink">
              <Icon name="lock" className="size-[15px]" />
            </span>
            {APP_NAME}
          </span>

          <div className={`${cardClass} p-5`}>
            <h1 className="text-[23px] font-bold tracking-[-0.02em]">เข้าสู่ระบบ</h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              เข้าสู่ระบบเพื่อค้นหาและจองตู้ล็อกเกอร์
            </p>

            {error ? (
              <div className="mt-4">
                <ErrorState message={error} />
              </div>
            ) : null}

            <form className="mt-5 grid gap-3" onSubmit={(event) => void onSubmit(event)}>
              <label className="block">
                <span className={labelClass}>อีเมล</span>
                <input
                  className={`${fieldClass} mt-1.5`}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
              <label className="block">
                <span className={labelClass}>รหัสผ่าน</span>
                <input
                  className={`${fieldClass} mt-1.5`}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className={`${primaryButtonClass} w-full`} disabled={pending} type="submit">
                {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-ink-faint">
              <span className="h-px flex-1 bg-line" />
              หรือ
              <span className="h-px flex-1 bg-line" />
            </div>

            <button
              type="button"
              className={`${secondaryButtonClass} w-full`}
              onClick={() => void onGoogle()}
            >
              เข้าสู่ระบบด้วย Google
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
