import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError, cancelReservation, listReservations } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatTimeRange, money, statusLabel, statusTone } from '../lib/format'
import type { Reservation } from '../lib/types'
import { Icon } from '../ui/icons'
import {
  cardClass,
  cardCtaClass,
  cardGridClass,
  cardTitleClass,
  filterRowClass,
  labelClass,
  linkButtonClass,
  Page,
  priceClass,
  quietButtonClass,
} from '../ui/Page'
import { Badge, Chip, EmptyState, ErrorState, SkeletonList } from '../ui/states'

const STATUS_FILTERS = [
  { id: 'Reserved', label: 'จองอยู่' },
  { id: 'Cancelled', label: 'ยกเลิกแล้ว' },
  { id: 'Expired', label: 'หมดอายุ' },
] as const

export function HistoryPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const queryClient = useQueryClient()
  const [status, setStatus] = useState('')

  const history = useQuery({
    queryKey: ['reservations', 'list'],
    queryFn: () => listReservations(token),
    enabled: Boolean(token),
  })

  const inFlight = useRef<string | null>(null)
  const cancel = useMutation({
    mutationFn: (id: string) => cancelReservation(token, id),
    onSuccess: (updated) => {
      queryClient.setQueryData<{ items: Reservation[] }>(
        ['reservations', 'list'],
        (current) => {
          if (!current) return current
          return {
            items: current.items.map((row) => (row.id === updated.id ? updated : row)),
          }
        },
      )
      queryClient.setQueryData(['reservations', updated.id], updated)
      void queryClient.invalidateQueries({ queryKey: ['lockers'] })
    },
  })
  const cancellingId = cancel.isPending ? cancel.variables : undefined

  const items = useMemo(() => {
    const rows = history.data?.items ?? []
    if (!status) {
      return rows
    }
    return rows.filter((item) => item.status === status)
  }, [history.data?.items, status])

  if (history.isLoading) {
    return (
      <Page title="ประวัติการจอง" wide>
        <SkeletonList count={3} />
      </Page>
    )
  }

  if (history.isError) {
    return (
      <Page title="ประวัติการจอง" wide>
        <ErrorState
          message="โหลดประวัติไม่สำเร็จ"
          hint="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
          onRetry={() => void history.refetch()}
        />
      </Page>
    )
  }

  return (
    <Page title="ประวัติการจอง" wide>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className={`${filterRowClass} min-w-0 flex-1`}>
          {STATUS_FILTERS.map((item) => (
            <Chip
              compact
              key={item.id}
              pressed={status === item.id}
              onClick={() => setStatus((current) => (current === item.id ? '' : item.id))}
            >
              {item.label}
            </Chip>
          ))}
        </div>
        {status ? (
          <button type="button" className={`${linkButtonClass} shrink-0 text-xs`} onClick={() => setStatus('')}>
            ล้างตัวกรอง
          </button>
        ) : null}
      </div>

      {cancel.isError ? (
        <div className="mb-3">
          <ErrorState
            message={
              cancel.error instanceof ApiRequestError
                ? cancel.error.message
                : 'ยกเลิกไม่สำเร็จ กรุณาลองใหม่'
            }
          />
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          message={status ? 'ไม่พบรายการในสถานะนี้' : 'ยังไม่มีประวัติการจอง'}
          hint={status ? 'ลองเลือกสถานะอื่น หรือล้างตัวกรอง' : 'เริ่มจากค้นหาตู้ใกล้ตัวได้เลย'}
          actionLabel={status ? 'ล้างตัวกรอง' : undefined}
          onAction={status ? () => setStatus('') : undefined}
        />
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

function HistoryCard({
  item,
  cancelling,
  onCancel,
}: {
  item: Reservation
  cancelling: boolean
  onCancel: () => void
}) {
  const reserved = item.status === 'Reserved'

  return (
    <article className={`${cardClass} min-w-0 overflow-hidden transition-colors hover:border-accent-line`}>
      <Link to={`/reservations/${item.id}`} className="block cursor-pointer p-4 hover:bg-elevated">
        <div className="flex items-start justify-between gap-3">
          <h2 className={`min-w-0 ${cardTitleClass}`}>{item.station_name}</h2>
          <Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge>
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
          <span className={cardCtaClass}>
            รายละเอียด
            <Icon name="arrow" className="size-3.5" />
          </span>
        </div>
      </Link>
      {reserved ? (
        <div className="border-t border-line px-3 py-2">
          <button type="button" className={quietButtonClass} disabled={cancelling} onClick={onCancel}>
            {cancelling ? 'กำลังยกเลิก…' : 'ยกเลิก'}
          </button>
        </div>
      ) : null}
    </article>
  )
}
