import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ApiRequestError, cancelReservation, listReservations } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatTimeRange, money, statusTone } from '../lib/format'
import { Page, secondaryButtonClass } from '../ui/Page'
import { Badge, EmptyState, ErrorState, Skeleton } from '../ui/states'

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
        <div className="space-y-3">
          <Skeleton />
          <Skeleton />
        </div>
      </Page>
    )
  }

  if (history.isError) {
    return (
      <Page title="ประวัติการจอง" wide>
        <ErrorState message="โหลดประวัติไม่สำเร็จ" onRetry={() => void history.refetch()} />
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
        <EmptyState message="ยังไม่มีประวัติการจอง" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">
                    {item.reservation_number}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {item.station_name} · {item.size}
                  </p>
                </div>
                <Badge tone={statusTone(item.status)}>{item.status}</Badge>
              </div>
              <p className="mt-2 text-sm text-slate-600">{item.address}</p>
              <p className="mt-1 text-sm text-slate-600">
                {formatTimeRange(item.start_time, item.end_time)}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xl font-bold text-slate-900">{money(item.total_price)}</p>
                <div className="flex gap-2">
                  <Link
                    to={`/reservations/${item.id}`}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-indigo-600"
                  >
                    ดูรายละเอียด
                  </Link>
                  {item.status === 'Reserved' ? (
                    <button
                      type="button"
                      className={secondaryButtonClass}
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(item.id)}
                    >
                      ยกเลิก
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  )
}
