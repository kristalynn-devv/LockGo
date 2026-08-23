import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router-dom'
import {
  ApiRequestError,
  depositReservation,
  getReservation,
  pickupReservation,
} from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDateTime, money, statusLabel, statusTone } from '../lib/format'
import { isAwaitingPayment, type Reservation } from '../lib/types'
import { AccessTicket } from '../ui/AccessTicket'
import { Icon } from '../ui/icons'
import { PayCard } from '../ui/PayCard'
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
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className="text-right font-semibold wrap-break-word">{value}</dd>
    </div>
  )
}

export function ConfirmPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const queryClient = useQueryClient()
  const confirmed = Boolean(
    (useLocation().state as { confirmed?: boolean } | null)?.confirmed,
  )

  const reservation = useQuery({
    queryKey: ['reservations', id],
    queryFn: () => getReservation(token, id),
    enabled: Boolean(token && id),
  })

  const deposit = useMutation({
    mutationFn: () => depositReservation(token, id),
    onSuccess: (updated) => applyReservation(queryClient, updated),
  })

  const pickup = useMutation({
    mutationFn: () => pickupReservation(token, id),
    onSuccess: (updated) => applyReservation(queryClient, updated),
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
  const reserved = item.status === 'Reserved'
  const unpaid = isAwaitingPayment(item)
  const paidLocker = item.paid && (reserved || item.status === 'Active' || item.status === 'Completed')
  const busy = deposit.isPending || pickup.isPending
  const actionError = deposit.error ?? pickup.error

  return (
    <Page title={confirmed ? undefined : 'รายละเอียดการจอง'}>
      {unpaid ? (
        <div className="mb-3">
          {confirmed ? (
            <p className="mb-2 text-sm text-ink-muted">จองสำเร็จ — ชำระเงินเพื่อรับ QR เปิดตู้</p>
          ) : null}
          <PayCard item={item} />
        </div>
      ) : paidLocker ? (
        <div className="mb-3">
          {confirmed ? (
            <p className="mb-2 text-sm text-ink-muted">จองสำเร็จ — ยื่น QR ให้ตู้สแกน</p>
          ) : null}
          <LockerPanel
            item={item}
            busy={busy}
            error={actionError}
            onDeposit={() => deposit.mutate()}
            onPickup={() => pickup.mutate()}
          />
        </div>
      ) : null}

      <section className={`${cardClass} ${confirmed ? 'rise' : ''} p-4 text-center sm:p-6`}>
        {confirmed ? (
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-ok-soft text-ok">
            <Icon name="check" className="size-6" />
          </div>
        ) : (
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent-soft text-accent-text">
            <Icon name="lock" className="size-6" />
          </div>
        )}

        <p className={`${labelClass} mt-4`}>หมายเลขการจอง</p>
        <p className="mt-1 text-2xl font-bold tracking-wider tabular-nums">
          {item.reservation_number}
        </p>
        <div className="mt-2.5">
          <Badge tone={statusTone(item.status, item.paid)}>
            {statusLabel(item.status, item.paid)}
          </Badge>
        </div>

        <dl className="mt-6 text-left">
          <Row label="ตู้" value={item.station_name} />
          <Row label="ที่อยู่" value={item.address} />
          <Row label="ช่อง" value={`${item.size} · ${item.compartment_label}`} />
          <Row label="เริ่ม" value={formatDateTime(item.start_time)} />
          <Row label="สิ้นสุด" value={formatDateTime(item.end_time)} />
          <Row label="เข้าใช้ภายใน" value={formatDateTime(item.no_show_deadline)} />
          <Row label="ราคา" value={`${money(item.unit_price)} × ${item.duration_hours} ชม.`} />
          <Row label="ราคารวม" value={money(item.total_price)} />
          <Row label="สถานะ" value={statusLabel(item.status, item.paid)} />
        </dl>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <Link to="/" className={`${secondaryButtonClass} w-full`}>
            กลับหน้าแรก
          </Link>
          <Link
            to="/history"
            className={`${unpaid ? secondaryButtonClass : primaryButtonClass} w-full`}
          >
            ดูประวัติ
          </Link>
        </div>
      </section>
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

function LockerPanel({
  item,
  busy,
  error,
  onDeposit,
  onPickup,
}: {
  item: Reservation
  busy: boolean
  error: unknown
  onDeposit: () => void
  onPickup: () => void
}) {
  const reserved = item.status === 'Reserved'
  const active = item.status === 'Active'
  const completed = item.status === 'Completed'

  return (
    <section className={`${cardClass} p-4 sm:p-6`}>
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text">
          <Icon name={active || completed ? 'box' : 'lock'} className="size-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-ink">ตั๋วเปิดตู้</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {reserved
              ? 'ยื่นหน้าจอให้เครื่องสแกนที่ตู้ — ยังไม่ต่อฮาร์ดแวร์จริง'
              : active
                ? 'ของอยู่ในช่องแล้ว สแกนอีกครั้งเมื่อมารับ'
                : 'รับของแล้ว ช่องว่างแล้ว'}
          </p>
        </div>
      </div>

      {item.access_code ? (
        <div className="mt-4">
          <AccessTicket
            reservationNumber={item.reservation_number}
            accessCode={item.access_code}
          />
        </div>
      ) : null}

      {error ? (
        <div className="mt-3">
          <ErrorState
            message={
              error instanceof ApiRequestError ? error.message : 'เปิดตู้ไม่สำเร็จ กรุณาลองใหม่'
            }
          />
        </div>
      ) : null}

      {reserved ? (
        <button
          type="button"
          className={`${primaryButtonClass} mt-4 w-full`}
          disabled={busy}
          onClick={onDeposit}
        >
          {busy ? 'กำลังเปิดตู้…' : 'ตู้สแกนแล้ว — ฝากของ'}
        </button>
      ) : null}

      {active ? (
        <button
          type="button"
          className={`${primaryButtonClass} mt-4 w-full`}
          disabled={busy}
          onClick={onPickup}
        >
          {busy ? 'กำลังเปิดตู้…' : 'ตู้สแกนแล้ว — รับของ'}
        </button>
      ) : null}
    </section>
  )
}
