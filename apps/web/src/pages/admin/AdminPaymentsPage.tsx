import { listAdminPayments } from '../../lib/api'
import { ADMIN_PAYMENT_METHOD_OPTIONS } from '../../lib/adminFilterOptions'
import { useAdminList } from '../../lib/adminQuery'
import { formatDateTime, money } from '../../lib/format'
import type { Payment } from '../../lib/types'
import { AdminDataTable, type AdminColumn } from '../../ui/AdminDataTable'
import { AdminFilterBar, AdminFilterChips } from '../../ui/AdminFilters'
import { Page } from '../../ui/Page'
import { Badge } from '../../ui/states'

const METHOD_LABELS: Record<string, string> = {
  promptpay: 'พร้อมเพย์',
  card: 'บัตร',
  bank: 'โอนธนาคาร',
}

const COLUMNS: AdminColumn<Payment>[] = [
  {
    header: 'หมายเลขจอง',
    card: 'title',
    className: 'font-mono text-xs',
    cell: (item) => item.reservation_number,
  },
  {
    header: 'วันที่',
    className: 'whitespace-nowrap text-ink-muted',
    cell: (item) => formatDateTime(item.created_at),
  },
  { header: 'สถานี', hide: 'md', cell: (item) => item.station_name },
  { header: 'วิธีชำระ', cell: (item) => METHOD_LABELS[item.method] ?? item.method },
  {
    header: 'สถานะ',
    card: 'badge',
    cell: (item) => <Badge tone="bg-ok-soft text-ok">{item.status}</Badge>,
  },
  {
    header: 'จำนวนเงิน',
    align: 'right',
    className: 'font-semibold tabular-nums',
    cell: (item) => money(item.amount),
  },
]

export function AdminPaymentsPage() {
  const list = useAdminList({
    resource: 'payments',
    filters: ['method'],
    fetch: (token, query) => listAdminPayments(token, query),
  })

  return (
    <Page title="ประวัติการชำระเงิน" wide>
      <AdminFilterBar active={list.filtersActive} onClear={list.clearFilters}>
        <AdminFilterChips
          label="วิธีชำระ"
          value={list.value('method')}
          options={ADMIN_PAYMENT_METHOD_OPTIONS}
          onChange={(next) => list.setFilter('method', next)}
        />
      </AdminFilterBar>

      <AdminDataTable
        query={list.query}
        columns={COLUMNS}
        rowKey={(item) => item.id}
        errorMessage="โหลดประวัติการชำระเงินไม่สำเร็จ"
        emptyMessage={list.filtersActive ? 'ไม่พบรายการตามตัวกรอง' : 'ยังไม่มีรายการชำระเงิน'}
        emptyAction={
          list.filtersActive ? { label: 'ล้างตัวกรอง', onClick: list.clearFilters } : undefined
        }
        pagination={list.pagination}
      />
    </Page>
  )
}
