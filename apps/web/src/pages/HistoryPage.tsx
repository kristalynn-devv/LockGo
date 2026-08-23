import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiRequestError, cancelReservation, listReservations } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatTimeRange, money, statusTone } from '../lib/format'
import type { Reservation } from '../lib/types'
import { cardClass, cardGridClass, linkButtonClass, Page, secondaryButtonClass } from '../ui/Page'
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
      <div className="mb-4 flex flex-wrap items-center gap-2">
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
        {status ? (
          <button type="button" className={`${linkButtonClass} text-xs`} onClick={() => setStatus('')}>
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
            <article key={item.id} className={`${cardClass} min-w-0 p-4`}>
              <div>
                <p className="text-base font-semibold tabular-nums">
                  {item.reservation_number}
                </p>
                <p className="text-sm text-ink-muted">
                  {item.size} · {item.compartment_label}
                </p>
              </div>

              <div className="mt-2">
                <p className="truncate text-sm text-ink-muted">{item.station_name}</p>
                <p className="truncate text-sm text-ink-muted">{item.address}</p>
              </div>

              <p className="mt-1 text-sm text-ink-muted tabular-nums">
                {formatTimeRange(item.start_time, item.end_time)}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xl font-bold tabular-nums">{money(item.total_price)}</p>
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Link
                  to={`/reservations/${item.id}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-ctl px-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-soft"
                >
                  รายละเอียด
                </Link>
                {item.status === 'Reserved' ? (
                  <button
                    type="button"
                    className={`${secondaryButtonClass} min-h-10 px-3.5 text-sm`}
                    disabled={cancellingId === item.id}
                    onClick={() => {
                      if (inFlight.current || cancel.isPending) return
                      inFlight.current = item.id
                      cancel.mutate(item.id, {
                        onSettled: () => {
                          inFlight.current = null
                        },
                      })
                    }}
                  >
                    {cancellingId === item.id ? 'กำลังยกเลิก…' : 'ยกเลิก'}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  )
}
