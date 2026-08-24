import type { ReactNode } from 'react'
import { cardClass, secondaryButtonClass } from './Page'

function SkeletonBar({ className = 'w-3/4' }: { className?: string }) {
  return <div className={`shimmer h-3.5 rounded bg-elevated ${className}`} />
}

export const adminTableWrapClass =
  'overflow-x-auto rounded-lg border border-line bg-surface shadow-sm'

export const adminTableClass = 'w-full min-w-[640px] border-collapse text-left text-sm'

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className={adminTableWrapClass}>
      <table className={adminTableClass}>{children}</table>
    </div>
  )
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-elevated text-xs font-medium uppercase tracking-wide text-ink-muted">
      {children}
    </thead>
  )
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-line">{children}</tbody>
}

export function AdminTh({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <th className={`px-4 py-3 font-medium ${className}`}>{children}</th>
}

export function AdminTd({
  children,
  className = '',
  colSpan,
}: {
  children: ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td className={`px-4 py-3 align-middle ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}

/** โหลดตารางแอดมิน — โครงเดียวกับ AdminTable / การ์ดบนมือถือ */
export function AdminTableSkeleton({
  rows = 6,
  columns = 5,
}: {
  rows?: number
  columns?: number
}) {
  return (
    <>
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: Math.min(rows, 4) }, (_, index) => (
          <div key={index} className={`${cardClass} p-4`}>
            <div className="flex items-start justify-between gap-3">
              <SkeletonBar className="h-4 w-1/2" />
              <SkeletonBar className="h-5 w-14 rounded-full" />
            </div>
            <div className="mt-3 grid gap-2">
              {Array.from({ length: Math.min(columns, 3) }, (_, meta) => (
                <div key={meta} className="flex justify-between gap-3">
                  <SkeletonBar className="h-3 w-16" />
                  <SkeletonBar className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block">
        <AdminTable>
          <AdminTableHead>
            <tr>
              {Array.from({ length: columns }, (_, index) => (
                <AdminTh key={index}>
                  <SkeletonBar className="h-3 w-16" />
                </AdminTh>
              ))}
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {Array.from({ length: rows }, (_, row) => (
              <tr key={row}>
                {Array.from({ length: columns }, (_, col) => (
                  <AdminTd key={col}>
                    <SkeletonBar className={col === columns - 1 ? 'ml-auto w-20' : 'w-3/4'} />
                  </AdminTd>
                ))}
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      </div>
    </>
  )
}

export function TablePagination({
  page,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  page: number
  onPrevious: () => void
  onNext: () => void
  hasPrevious: boolean
  hasNext: boolean
}) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <button
        type="button"
        className={secondaryButtonClass}
        disabled={!hasPrevious}
        onClick={onPrevious}
      >
        ก่อนหน้า
      </button>
      <span className="text-sm text-ink-muted">หน้า {page}</span>
      <button
        type="button"
        className={secondaryButtonClass}
        disabled={!hasNext}
        onClick={onNext}
      >
        ถัดไป
      </button>
    </div>
  )
}
