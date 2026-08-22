import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getReservation } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, money, statusTone } from '../lib/format'
import { Page, primaryButtonClass } from '../ui/Page'
import { Badge, ErrorState, Skeleton } from '../ui/states'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  )
}

export function ConfirmPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const token = session?.access_token ?? ''

  const reservation = useQuery({
    queryKey: ['reservations', id],
    queryFn: () => getReservation(token, id),
    enabled: Boolean(token && id),
  })

  if (reservation.isLoading) {
    return (
      <Page>
        <Skeleton className="h-64" />
      </Page>
    )
  }

  if (reservation.isError || !reservation.data) {
    return (
      <Page title="การจอง">
        <ErrorState
          message="โหลดรายละเอียดการจองไม่สำเร็จ"
          onRetry={() => void reservation.refetch()}
        />
      </Page>
    )
  }

  const item = reservation.data

  return (
    <Page>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600">
          ✓
        </div>
        <p className="mt-4 text-center text-xs font-medium uppercase tracking-wide text-slate-500">
          หมายเลขการจอง
        </p>
        <p className="mt-1 text-center text-2xl font-bold tracking-wider text-slate-900">
          {item.reservation_number}
        </p>

        <div className="mt-6 space-y-3">
          <Row label="ตู้" value={item.station_name} />
          <Row label="สถานที่" value={item.address} />
          <Row label="ขนาดช่อง" value={`${item.size} · ${item.compartment_label}`} />
          <Row label="เวลาเริ่ม" value={formatDateTime(item.start_time)} />
          <Row label="เวลาสิ้นสุด" value={formatDateTime(item.end_time)} />
          <Row label="ราคา" value={money(item.total_price)} />
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">สถานะ</span>
            <Badge tone={statusTone(item.status)}>{item.status}</Badge>
          </div>
        </div>
      </div>

      <Link to="/" className={`${primaryButtonClass} mt-6 block text-center`}>
        กลับหน้าแรก
      </Link>
    </Page>
  )
}
