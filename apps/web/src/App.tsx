import { APP_NAME } from '@lockgo/shared'

export default function App() {
  return (
    <main className="min-h-svh bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{APP_NAME}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Find and reserve a locker. Scaffold is up — screens come next.
        </p>
      </div>
    </main>
  )
}
