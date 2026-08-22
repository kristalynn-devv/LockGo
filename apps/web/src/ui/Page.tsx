import type { ReactNode } from 'react'

export function Page({
  title,
  children,
  wide = false,
}: {
  title?: string
  children: ReactNode
  wide?: boolean
}) {
  return (
    <main className={`mx-auto px-4 py-6 sm:px-6 ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
      {title ? <h1 className="mb-4 text-2xl font-semibold text-slate-900">{title}</h1> : null}
      {children}
    </main>
  )
}

export const fieldClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500'

export const primaryButtonClass =
  'w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300'

export const secondaryButtonClass =
  'rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50'
