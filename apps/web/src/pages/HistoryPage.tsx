import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiRequestError, cancelReservation } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatTimeRange, money, statusLabel, statusTone } from '../lib/format'
import { useReservationList } from '../lib/reservations'
import { isAwaitingPayment, isLockerReady, type Reservation } from '../lib/types'
import { Icon } from '../ui/icons'
import {
  cardClass,
  cardCtaClass,
  cardGridClass,
  cardTitleClass,
  filterRowClass,
  labelClass,
  Page,
  priceClass,
  primaryButtonClass,
  quietButtonClass,
} from '../ui/Page'
import { Badge, Chip, EmptyState, ErrorState, SkeletonList } from '../ui/states'

const HISTORY_FILTERS = [
  { id: 'Completed', label: 'เสร็จแล้ว' },
  { id: 'Cancelled', label: 'ยกเลิกแล้ว' },
  { id: 'Expired', label: 'หมดอายุ' },
] as const

const STATUS_QUERY = ['unpaid', 'Active', 'Completed', 'Cancelled', 'Expired'] as const

type HistoryStatus = (typeof STATUS_QUERY)[number]

function parseHistoryStatus(value: string | null): HistoryStatus | '' {
  return STATUS_QUERY.some((id) => id === value) ? (value as HistoryStatus) : ''
}

function historyTitle(status: HistoryStatus | '') {
  if (status === 'unpaid') return 'รอชำระ'
  if (status === 'Active') return 'ใช้งานอยู่'
  return 'ประวัติการจอง'
}

export function HistoryPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = parseHistoryStatus(searchParams.get('status'))

  const setStatus = (next: string) => {
    setSearchParams(next ? { status: next } : {}, { replace: true })
  }

  const history = useReservationList(token)

  const inFlight = useRef<string | null>(null)
  const cancel = useMutation({
    mutationFn: (id: string) => cancelReservation(token, id),
    onSuccess: (updated) => {
      applyReservation(queryClient, updated)
    },
  })
  const cancellingId = cancel.isPending ? cancel.variables : undefined

  const rows = history.data?.items ?? []
  const actionTab = status === 'unpaid' || status === 'Active'
  const archiveFilter = HISTORY_FILTERS.some((item) => item.id === status)

  const items = useMemo(() => {
    if (status === 'unpaid') {
      return rows.filter(isAwaitingPayment)
    }
    if (status === 'Active') {
      return rows.filter(isLockerReady)
    }
    if (status) {
      return rows.filter((item) => item.status === status)
    }
    return rows.filter((item) => HISTORY_FILTERS.some((filter) => filter.id === item.status))
  }, [rows, status])

  if (history.isLoading) {
    return (
      <Page title={historyTitle(status)} wide>
        <SkeletonList count={3} />
      </Page>
    )
  }

  if (history.isError) {
    return (
      <Page title={historyTitle(status)} wide>
        <ErrorState
          message="โหลดประวัติไม่สำเร็จ"
          hint="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
          onRetry={() => void history.refetch()}
        />
      </Page>
    )
  }

  return (
    <Page title={historyTitle(status)} wide>
      {actionTab ? null : (
        <div className={`${filterRowClass} mb-4`}>
          {HISTORY_FILTERS.map((item) => (
            <Chip
              key={item.id}
              compact
              pressed={status === item.id}
              onClick={() => setStatus(status === item.id ? '' : item.id)}
            >
              {item.label}
            </Chip>
          ))}
          {archiveFilter ? (
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center px-1 text-xs font-medium text-accent-text hover:underline"
              onClick={() => setStatus('')}
            >
              ล้างตัวกรอง
            </button>
          ) : null}
        </div>
      )}

      {cancel.isError ? (
        <div className="mb-3">
          <ErrorState
            message={
              cancel.error instanceof ApiRequestError
                ? cancel.error.message
                : 'ทำรายการไม่สำเร็จ กรุณาลองใหม่'
            }
          />
        </div>
      ) : null}

      {items.length === 0 ? (
        actionTab ? (
          <EmptyState
            message={status === 'unpaid' ? 'ยังไม่มีใบรอชำระ' : 'ยังไม่มีใบที่ใช้งาน'}
          />
        ) : (
          <EmptyState
            message={status ? 'ไม่พบรายการในสถานะนี้' : 'ยังไม่มีประวัติการจอง'}
            hint={archiveFilter ? 'ลองเลือกสถานะอื่น หรือล้างตัวกรอง' : 'เริ่มจากค้นหาตู้ใกล้ตัวได้เลย'}
            actionLabel={archiveFilter ? 'ล้างตัวกรอง' : undefined}
            onAction={archiveFilter ? () => setStatus('') : undefined}
          />
        )
      ) : (
        <div className={cardGridClass}>
          {items.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              cancelling={cancellingId === item.id}
              onCancel={() => {
                if (inFlight.current || cancel.isPending) return
                inFlight.current = item.id
                cancel.mutate(item.id, {
                  onSettled: () => {
                    inFlight.current = null
                  },
                })
              }}
            />
          ))}
        </div>
      )}
    </Page>
  )
}

function applyReservation(
  queryClient: ReturnType<typeof useQueryClient>,
  updated: Reservation,
) {
  queryClient.setQueryData(['reservations', updated.id], updated)
  queryClient.setQueryData<{ items: Reservation[] }>(['reservations', 'list'], (current) => {
    if (!current) return current
    return {
      items: current.items.map((row) => (row.id === updated.id ? updated : row)),
    }
  })
  void queryClient.invalidateQueries({ queryKey: ['lockers'] })
}

function HistoryCard({
  item,
  cancelling,
  onCancel,
}: {
  item: Reservation
  cancelling: boolean
  onCancel: () => void
}) {
  const unpaid = isAwaitingPayment(item)
  const ready = isLockerReady(item)
  const active = item.status === 'Active'

  return (
    <article
      className={`${cardClass} min-w-0 overflow-hidden transition-colors ${unpaid ? 'border-warn/50' : ready ? 'border-ok/50' : 'hover:border-accent-line'
        }`}
    >
      <Link to={`/reservations/${item.id}`} className="block cursor-pointer p-4 hover:bg-elevated">
        <div className="flex items-start justify-between gap-3">
          <h2 className={`min-w-0 truncate ${cardTitleClass}`}>{item.station_name}</h2>
          <Badge tone={statusTone(item.status, item.paid)}>{statusLabel(item.status, item.paid)}</Badge>
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium tabular-nums">
          <Icon name="clock" className="size-4 text-ink-muted" />
          <span className="truncate">{formatTimeRange(item.start_time, item.end_time)}</span>
        </p>

        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
          <Icon name="pin" className="size-4" />
          <span className="truncate">{item.address}</span>
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Badge tone="bg-elevated text-ink">{item.size}</Badge>
          <span className="text-sm text-ink-muted">{item.compartment_label}</span>
        </div>

        <p className="mt-2 text-xs text-ink-faint tabular-nums">{item.reservation_number}</p>

        <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
          <div>
            <p className={labelClass}>ราคารวม</p>
            <p className={priceClass}>{money(item.total_price)}</p>
          </div>
          {unpaid || ready ? null : (
            <span className={cardCtaClass}>
              รายละเอียด
              <Icon name="arrow" className="size-3.5" />
            </span>
          )}
        </div>
      </Link>
      {unpaid ? (
        <div className="grid gap-1.5 border-t border-line p-3">
          <Link to={`/reservations/${item.id}/pay`} className={`${primaryButtonClass} w-full`}>
            ชำระเงิน {money(item.total_price)}
          </Link>
          <button
            type="button"
            className={quietButtonClass}
            disabled={cancelling}
            onClick={onCancel}
          >
            {cancelling ? 'กำลังยกเลิก…' : 'ยกเลิก'}
          </button>
        </div>
      ) : null}
      {ready ? (
        <div className="border-t border-line p-3">
          <Link to={`/reservations/${item.id}`} className={`${primaryButtonClass} w-full`}>
            {active ? 'ดู QR รับของ' : 'ดู QR เปิดตู้'}
          </Link>
        </div>
      ) : null}
    </article>
  )
}
