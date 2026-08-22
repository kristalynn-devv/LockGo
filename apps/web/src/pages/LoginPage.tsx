import { APP_NAME } from '@lockgo/shared'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { authErrorMessage } from '../lib/format'
import { ErrorState } from '../ui/states'
import { fieldClass, primaryButtonClass, secondaryButtonClass } from '../ui/Page'

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
      const message = caught instanceof Error ? caught.message : ''
      setError(authErrorMessage(message))
    } finally {
      setPending(false)
    }
  }

  async function onGoogle() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : ''
      setError(authErrorMessage(message))
    }
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col justify-center px-4 py-6 sm:px-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{APP_NAME}</h1>
        <p className="mt-2 text-sm text-slate-600">เข้าสู่ระบบเพื่อค้นหาและจองตู้ล็อกเกอร์</p>

        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}

        <form className="mt-6 space-y-3" onSubmit={(event) => void onSubmit(event)}>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">อีเมล</span>
            <input
              className={`${fieldClass} mt-1`}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">รหัสผ่าน</span>
            <input
              className={`${fieldClass} mt-1`}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className={primaryButtonClass} disabled={pending} type="submit">
            {pending ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <button
          type="button"
          className={`${secondaryButtonClass} mt-3 w-full`}
          onClick={() => void onGoogle()}
        >
          เข้าสู่ระบบด้วย Google
        </button>
      </div>
    </main>
  )
}
