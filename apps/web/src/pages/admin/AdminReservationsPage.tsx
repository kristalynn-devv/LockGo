import { listAdminReservations } from '../../lib/api'
import { ADMIN_RESERVATION_STATUS_OPTIONS } from '../../lib/adminFilterOptions'
import { useAdminList } from '../../lib/adminQuery'
import { formatTimeRange, money, statusLabel, statusTone } from '../../lib/format'
import type { AdminReservation } from '../../lib/types'
import { AdminDataTable, type AdminColumn } from '../../ui/AdminDataTable'
import { AdminFilterBar, AdminFilterChips } from '../../ui/AdminFilters'
import { Page } from '../../ui/Page'
import { Badge } from '../../ui/states'

const COLUMNS: AdminColumn<AdminReservation>[] = [
  {
    header: 'หมายเลข',
    card: 'title',
    className: 'font-mono text-xs text-ink-muted',
    cell: (item) => item.reservation_number,
  },
  { header: 'สถานี', className: 'font-medium', cell: (item) => item.station_name },
  {
    header: 'ลูกค้า',
    hide: 'lg',
    className: 'max-w-[160px] truncate text-ink-muted',
    cell: (item) => item.customer_name ?? item.user_id.slice(0, 8),
  },
  {
    header: 'ช่วงเวลา',
    className: 'min-w-[180px] tabular-nums',
    cell: (item) => formatTimeRange(item.start_time, item.end_time),
  },
  {
    header: 'สถานะ',
    card: 'badge',
    cell: (item) => (
      <Badge tone={statusTone(item.status, item.paid)}>{statusLabel(item.status, item.paid)}</Badge>
    ),
  },
  {
    header: 'ช่อง',
    hide: 'md',
    className: 'text-ink-muted',
    cell: (item) => `${item.size} · ${item.compartment_label}`,
  },
  {
    header: 'ราคารวม',
    align: 'right',
    className: 'font-semibold tabular-nums',
    cell: (item) => money(item.total_price),
  },
]

export function AdminReservationsPage() {
  const list = useAdminList({
    resource: 'reservations',
    filters: ['status'],
    fetch: (token, query) => listAdminReservations(token, query),
  })

  return (
    <Page title="การจองทั้งหมด" wide>
      <AdminFilterBar active={list.filtersActive} onClear={list.clearFilters}>
        <AdminFilterChips
          label="สถานะ"
          value={list.value('status')}
          options={ADMIN_RESERVATION_STATUS_OPTIONS}
          onChange={(next) => list.setFilter('status', next)}
        />
      </AdminFilterBar>

      <AdminDataTable
        query={list.query}
        columns={COLUMNS}
        rowKey={(item) => item.id}
        errorMessage="โหลดรายการจองไม่สำเร็จ"
        emptyMessage={list.filtersActive ? 'ไม่พบการจองตามตัวกรอง' : 'ยังไม่มีรายการจอง'}
        emptyHint={list.filtersActive ? 'ลองเลือกสถานะอื่นหรือล้างตัวกรอง' : undefined}
        emptyAction={
          list.filtersActive ? { label: 'ล้างตัวกรอง', onClick: list.clearFilters } : undefined
        }
        pagination={list.pagination}
      />
    </Page>
  )
}
