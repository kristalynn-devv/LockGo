import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { AdminListResult, AdminPagination } from '../lib/adminQuery'
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableSkeleton,
  AdminTd,
  AdminTh,
  TablePagination,
} from './AdminTable'
import { cardClass, labelClass } from './Page'
import { EmptyState, ErrorState } from './states'

/* --------------------------------------------------------------------------
   ตารางแอดมินแบบประกาศคอลัมน์ - จอเล็กแปลงเป็นการ์ดอัตโนมัติ
   ทุกหน้าเคยเขียน loading/error/empty/thead/tbody/pagination ซ้ำกันเอง
   -------------------------------------------------------------------------- */

export type AdminColumn<T> = {
  /** ชื่อหัวคอลัมน์ ใช้เป็น key ด้วย */
  header: string
  cell: (row: T) => ReactNode
  align?: 'right'
  /** ซ่อนคอลัมน์ในตารางเมื่อจอแคบ */
  hide?: 'md' | 'lg'
  /**
   * บทบาทตอนเป็นการ์ดบนมือถือ
   * title = หัวการ์ด · badge = มุมขวาบน · actions = แถวล่าง · hidden = ไม่แสดง
   */
  card?: 'title' | 'badge' | 'meta' | 'actions' | 'hidden'
  className?: string
}

function hideClass(hide?: 'md' | 'lg') {
  if (hide === 'md') return 'hidden md:table-cell'
  if (hide === 'lg') return 'hidden lg:table-cell'
  return ''
}

function Card<T>({ row, columns }: { row: T; columns: AdminColumn<T>[] }) {
  const title = columns.find((column) => column.card === 'title')
  const badge = columns.find((column) => column.card === 'badge')
  const actions = columns.filter((column) => column.card === 'actions')
  const meta = columns.filter(
    (column) => !column.card || column.card === 'meta',
  )

  return (
    <div className={`${cardClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 font-medium">{title ? title.cell(row) : null}</div>
        {badge ? <div className="shrink-0">{badge.cell(row)}</div> : null}
      </div>
      {meta.length > 0 ? (
        <dl className="mt-3 grid gap-1.5">
          {meta.map((column) => (
            <div key={column.header} className="flex items-baseline justify-between gap-3">
              <dt className={labelClass}>{column.header}</dt>
              <dd className="min-w-0 truncate text-right text-sm">{column.cell(row)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {actions.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-3">
          {actions.map((column) => (
            <div key={column.header}>{column.cell(row)}</div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function AdminDataTable<T>({
  query,
  columns,
  rowKey,
  errorMessage,
  emptyMessage,
  emptyHint,
  emptyAction,
  pagination,
}: {
  query: Pick<
    UseQueryResult<AdminListResult<T>>,
    'data' | 'isLoading' | 'isError' | 'isPlaceholderData' | 'refetch'
  >
  columns: AdminColumn<T>[]
  rowKey: (row: T) => string
  errorMessage: string
  emptyMessage: string
  emptyHint?: string
  emptyAction?: { label: string; onClick: () => void }
  pagination?: AdminPagination
}) {
  if (query.isLoading) {
    return <AdminTableSkeleton rows={6} columns={columns.length} />
  }

  if (query.isError) {
    return <ErrorState message={errorMessage} onRetry={() => void query.refetch()} />
  }

  const rows = query.data?.items ?? []

  if (rows.length === 0) {
    return (
      <EmptyState
        message={emptyMessage}
        hint={emptyHint}
        actionLabel={emptyAction?.label}
        onAction={emptyAction?.onClick}
      />
    )
  }

  return (
    // หรี่เฉพาะตอนสลับหน้า/ตัวกรอง (ข้อมูลบนจอยังเป็นของชุดเดิม)
    // ไม่ใช่ทุกครั้งที่ refetch เบื้องหลัง ไม่งั้นตารางจะกะพริบหลังกดบันทึกทุกครั้ง
    <div className={query.isPlaceholderData ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
      {/* มือถือ: การ์ดอ่านง่ายกว่าตารางเลื่อนแนวนอน */}
      <div className="grid gap-3 md:hidden">
        {rows.map((row) => (
          <Card key={rowKey(row)} row={row} columns={columns} />
        ))}
      </div>

      <div className="hidden md:block">
        <AdminTable>
          <AdminTableHead>
            <tr>
              {columns.map((column) => (
                <AdminTh
                  key={column.header}
                  className={`${hideClass(column.hide)} ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.header}
                </AdminTh>
              ))}
            </tr>
          </AdminTableHead>
          <AdminTableBody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-elevated/60">
                {columns.map((column) => (
                  <AdminTd
                    key={column.header}
                    className={`${hideClass(column.hide)} ${
                      column.align === 'right' ? 'text-right' : ''
                    } ${column.className ?? ''}`}
                  >
                    {column.cell(row)}
                  </AdminTd>
                ))}
              </tr>
            ))}
          </AdminTableBody>
        </AdminTable>
      </div>

      {pagination ? <TablePagination {...pagination} /> : null}
    </div>
  )
}
