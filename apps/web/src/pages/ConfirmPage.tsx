import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { getReservation } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, money, statusTone } from '../lib/format'
import { Icon } from '../ui/icons'
import {
  cardClass,
  labelClass,
  Page,
  primaryButtonClass,
  secondaryButtonClass,
} from '../ui/Page'
import { Badge, ErrorState, Skeleton } from '../ui/states'

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-line py-2.5 text-sm">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
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
        <Skeleton />
      </Page>
    )
  }

  if (reservation.isError || !reservation.data) {
    return (
      <Page title="การจอง">
        <ErrorState
          message="โหลดรายละเอียดการจองไม่สำเร็จ"
          hint="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
          onRetry={() => void reservation.refetch()}
        />
      </Page>
    )
  }

  const item = reservation.data

  return (
    <Page>
      <div>
        <section className={`${cardClass} rise px-5 py-7 text-center`}>
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-ok-soft text-ok">
            <Icon name="check" className="size-6" />
          </div>

          <p className={`${labelClass} mt-4`}>หมายเลขการจอง</p>
          <p className="mt-1 text-[26px] font-bold tracking-[0.14em] tabular-nums">
            {item.reservation_number}
          </p>
          <div className="mt-2.5">
            <Badge tone={statusTone(item.status)}>{item.status}</Badge>
          </div>

          <dl className="mt-6 text-left sm:grid sm:grid-cols-2 sm:gap-x-6">
            <Row label="ตู้" value={item.station_name} />
            <Row label="ช่อง" value={`${item.size} · ${item.compartment_label}`} />
            <Row label="เริ่ม" value={formatDateTime(item.start_time)} />
            <Row label="สิ้นสุด" value={formatDateTime(item.end_time)} />
            <Row label="เข้าใช้ภายใน" value={formatDateTime(item.no_show_deadline)} />
            <Row label="ราคารวม" value={money(item.total_price)} />
          </dl>

          <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
            <Link to="/history" className={`${secondaryButtonClass} w-full`}>
              ดูประวัติ
            </Link>
            <Link to="/" className={primaryButtonClass}>
              กลับหน้าแรก
            </Link>
          </div>
        </section>

        <p className="mt-3.5 text-center text-sm text-ink-muted">
          แสดงหมายเลขนี้ที่หน้าตู้เพื่อเปิดช่อง
        </p>
      </div>
    </Page>
  )
}
