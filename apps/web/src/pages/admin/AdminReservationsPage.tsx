import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { listAdminReservations } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatTimeRange, money, statusLabel, statusTone } from '../../lib/format'
import { Icon } from '../../ui/icons'
import { MenuSelect } from '../../ui/MenuSelect'
import {
  cardClass,
  cardGridClass,
  cardTitleClass,
  filterRowClass,
  labelClass,
  Page,
  priceClass,
  secondaryButtonClass,
} from '../../ui/Page'
import { Badge, EmptyState, ErrorState, SkeletonList } from '../../ui/states'

const STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'Reserved', label: 'จองอยู่' },
  { value: 'Active', label: 'ใช้งานอยู่' },
  { value: 'Completed', label: 'เสร็จแล้ว' },
  { value: 'Cancelled', label: 'ยกเลิกแล้ว' },
  { value: 'Expired', label: 'หมดอายุ' },
]

export function AdminReservationsPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  const setStatus = (next: string) => {
    setSearchParams(next ? { status: next } : {}, { replace: true })
  }
  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams)
    if (next <= 1) params.delete('page')
    else params.set('page', String(next))
    setSearchParams(params, { replace: true })
  }

  const reservations = useQuery({
    queryKey: ['admin', 'reservations', status, page],
    queryFn: () =>
      listAdminReservations(token, {
        status: status || undefined,
        page: String(page),
        limit: '20',
      }),
    enabled: Boolean(token),
  })

  return (
    <Page title="การจองทั้งหมด" wide>
      <div className={`${filterRowClass} mb-4`}>
        <MenuSelect
          variant="pill"
          label="สถานะ"
          value={status}
          options={STATUS_OPTIONS}
          marked={Boolean(status)}
          onChange={setStatus}
        />
      </div>

      {reservations.isLoading ? <SkeletonList count={4} /> : null}

      {reservations.isError ? (
        <ErrorState message="โหลดรายการจองไม่สำเร็จ" onRetry={() => void reservations.refetch()} />
      ) : null}

      {reservations.isSuccess && reservations.data.items.length === 0 ? (
        <EmptyState message="ไม่พบรายการจอง" />
      ) : null}

      {reservations.isSuccess && reservations.data.items.length > 0 ? (
        <>
          <div className={cardGridClass}>
            {reservations.data.items.map((item) => (
              <div key={item.id} className={`${cardClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className={`min-w-0 truncate ${cardTitleClass}`}>{item.station_name}</h2>
                  <Badge tone={statusTone(item.status, item.paid)}>
                    {statusLabel(item.status, item.paid)}
                  </Badge>
                </div>
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
                  <Icon name="user" className="size-4" />
                  <span className="truncate">{item.customer_name ?? item.user_id}</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium tabular-nums">
                  <Icon name="clock" className="size-4 text-ink-muted" />
                  <span className="truncate">{formatTimeRange(item.start_time, item.end_time)}</span>
                </p>
                <p className="mt-2 text-xs text-ink-faint tabular-nums">{item.reservation_number}</p>
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <div>
                    <p className={labelClass}>ราคารวม</p>
                    <p className={priceClass}>{money(item.total_price)}</p>
                  </div>
                  <span className="text-sm text-ink-muted">
                    {item.size} · {item.compartment_label}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              ก่อนหน้า
            </button>
            <span className="text-sm text-ink-muted">หน้า {page}</span>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={reservations.data.items.length < 20}
              onClick={() => setPage(page + 1)}
            >
              ถัดไป
            </button>
          </div>
        </>
      ) : null}
    </Page>
  )
}
