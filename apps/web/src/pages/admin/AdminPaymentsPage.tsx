import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { listAdminPayments } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatDateTime, money } from '../../lib/format'
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

const METHOD_OPTIONS = [
  { value: '', label: 'ทุกวิธี' },
  { value: 'promptpay', label: 'พร้อมเพย์' },
  { value: 'card', label: 'บัตร' },
  { value: 'bank', label: 'โอนธนาคาร' },
]

export function AdminPaymentsPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [searchParams, setSearchParams] = useSearchParams()
  const method = searchParams.get('method') ?? ''
  const page = Number(searchParams.get('page') ?? '1')

  const setMethod = (next: string) => {
    setSearchParams(next ? { method: next } : {}, { replace: true })
  }
  const setPage = (next: number) => {
    const params = new URLSearchParams(searchParams)
    if (next <= 1) params.delete('page')
    else params.set('page', String(next))
    setSearchParams(params, { replace: true })
  }

  const payments = useQuery({
    queryKey: ['admin', 'payments', method, page],
    queryFn: () =>
      listAdminPayments(token, {
        method: method || undefined,
        page: String(page),
        limit: '20',
      }),
    enabled: Boolean(token),
  })

  return (
    <Page title="ประวัติการชำระเงิน" wide>
      <div className={`${filterRowClass} mb-4`}>
        <MenuSelect
          variant="pill"
          label="วิธีชำระ"
          value={method}
          options={METHOD_OPTIONS}
          marked={Boolean(method)}
          onChange={setMethod}
        />
      </div>

      {payments.isLoading ? <SkeletonList count={4} /> : null}

      {payments.isError ? (
        <ErrorState message="โหลดประวัติการชำระเงินไม่สำเร็จ" onRetry={() => void payments.refetch()} />
      ) : null}

      {payments.isSuccess && payments.data.items.length === 0 ? (
        <EmptyState message="ยังไม่มีรายการชำระเงิน" />
      ) : null}

      {payments.isSuccess && payments.data.items.length > 0 ? (
        <>
          <div className={cardGridClass}>
            {payments.data.items.map((item) => (
              <div key={item.id} className={`${cardClass} p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <h2 className={`min-w-0 truncate ${cardTitleClass}`}>{item.station_name}</h2>
                  <Badge tone="bg-ok-soft text-ok">{item.status}</Badge>
                </div>
                <p className="mt-1.5 text-sm text-ink-muted">{formatDateTime(item.created_at)}</p>
                <p className="mt-2 text-xs text-ink-faint tabular-nums">{item.reservation_number}</p>
                <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                  <div>
                    <p className={labelClass}>จำนวนเงิน</p>
                    <p className={priceClass}>{money(item.amount)}</p>
                  </div>
                  <span className="text-sm text-ink-muted">{item.method}</span>
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
              disabled={payments.data.items.length < 20}
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
