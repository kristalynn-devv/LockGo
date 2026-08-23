import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ApiRequestError, cancelReservation, listReservations } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatTimeRange, money, statusTone } from '../lib/format'
import { Icon } from '../ui/icons'
import { cardClass, cardGridClass, Page, secondaryButtonClass } from '../ui/Page'
import { Badge, EmptyState, ErrorState, SkeletonList } from '../ui/states'

export function HistoryPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const queryClient = useQueryClient()

  const history = useQuery({
    queryKey: ['reservations', 'list'],
    queryFn: () => listReservations(token),
    enabled: Boolean(token),
  })

  const cancel = useMutation({
    mutationFn: (id: string) => cancelReservation(token, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['reservations'] })
      void queryClient.invalidateQueries({ queryKey: ['lockers'] })
    },
  })

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

  const items = history.data?.items ?? []

  return (
    <Page title="ประวัติการจอง" wide>
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
        <EmptyState message="ยังไม่มีประวัติการจอง" hint="เริ่มจากค้นหาตู้ใกล้ตัวได้เลย" />
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

              <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                <Link
                  to={`/reservations/${item.id}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-ctl px-2.5 text-sm font-semibold text-accent-text transition-colors hover:bg-accent-soft"
                >
                  รายละเอียด
                  <Icon name="arrow" className="size-[15px]" />
                </Link>
                {item.status === 'Reserved' ? (
                  <button
                    type="button"
                    className={`${secondaryButtonClass} min-h-10 px-3.5 text-sm`}
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(item.id)}
                  >
                    ยกเลิก
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
