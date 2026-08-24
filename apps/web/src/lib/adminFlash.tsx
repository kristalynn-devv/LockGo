import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { Toaster, toast } from 'sonner'
import { useTheme } from './theme'
import { mutationErrorMessage } from './mutationError'

type AdminFlashContextValue = {
  success: (message: string) => void
  fail: (error: unknown) => void
  clear: () => void
}

const AdminFlashContext = createContext<AdminFlashContextValue | null>(null)

const toastShell =
  'flex w-full items-center gap-3 rounded-lg border px-4 py-3 shadow-lift font-sans'

function AdminToaster() {
  const { resolved } = useTheme()

  return (
    <Toaster
      theme={resolved}
      position="top-center"
      offset={64}
      closeButton
      className="admin-toaster"
      toastOptions={{
        classNames: {
          toast: toastShell,
          title: 'text-sm font-medium',
          closeButton:
            'absolute right-2 top-2 rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-ink-muted hover:text-ink',
        },
      }}
    />
  )
}

export function AdminFlashProvider({ children }: { children: ReactNode }) {
  const success = useCallback((message: string) => {
    toast.success(message, {
      duration: 4000,
      classNames: {
        toast: `${toastShell} border-ok/50 bg-ok-soft text-ok`,
        title: 'text-sm font-medium text-ok',
      },
    })
  }, [])

  const fail = useCallback((error: unknown) => {
    toast.error(mutationErrorMessage(error), {
      duration: 8000,
      classNames: {
        toast: `${toastShell} border-danger/50 bg-danger-soft text-danger`,
        title: 'text-sm font-medium text-danger',
        closeButton:
          'absolute right-2 top-2 rounded border border-danger/30 bg-danger-soft px-1.5 py-0.5 text-xs text-danger hover:opacity-80',
      },
    })
  }, [])

  const clear = useCallback(() => {
    toast.dismiss()
  }, [])

  return (
    <AdminFlashContext.Provider value={{ success, fail, clear }}>
      <AdminToaster />
      {children}
    </AdminFlashContext.Provider>
  )
}

export function useAdminFlash() {
  const ctx = useContext(AdminFlashContext)
  if (!ctx) {
    throw new Error('useAdminFlash must be used within AdminFlashProvider')
  }
  return ctx
}
