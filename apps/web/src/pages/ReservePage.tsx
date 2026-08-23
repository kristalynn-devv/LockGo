import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiRequestError, createReservation, getLocker } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  addDays,
  combineLocal,
  formatDateTime,
  MIN_TOTAL_PRICE,
  money,
  nextHour,
  toDateInput,
  toTimeInput,
  totalPrice,
} from '../lib/format'
import { SIZES, type Size } from '../lib/types'
import { Icon } from '../ui/icons'
import {
  ActionBar,
  cardClass,
  fieldClass,
  labelClass,
  linkButtonClass,
  Page,
  primaryButtonClass,
  secondaryButtonClass,
  splitGridClass,
  SplitLayout,
} from '../ui/Page'
import { ErrorState, NoticeCard, Skeleton } from '../ui/states'

function isSize(value: string | null): value is Size {
  return value === 'Small' || value === 'Medium' || value === 'Large'
}

export function ReservePage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const idempotencyKey = useRef(crypto.randomUUID())

  const startDefault = useMemo(() => nextHour(), [])
  const requestedSize = params.get('size')
  const [size, setSize] = useState<Size>(isSize(requestedSize) ? requestedSize : 'Medium')
  const [date, setDate] = useState(toDateInput(startDefault))
  const [time, setTime] = useState(toTimeInput(startDefault))
  const [duration, setDuration] = useState(4)
  const [formError, setFormError] = useState<string | null>(null)

  const locker = useQuery({
    queryKey: ['lockers', 'detail', id],
    queryFn: () => getLocker(token, id),
    enabled: Boolean(token && id),
  })

  const mutation = useMutation({
    mutationFn: () => {
      const start = combineLocal(date, time)
      return createReservation(
        token,
        {
          station_id: id,
          size,
          start_time: start.toISOString(),
          duration_hours: duration,
        },
        idempotencyKey.current,
      )
    },
    onSuccess: (reservation) => {
      navigate(`/reservations/${reservation.id}`, { replace: true })
    },
  })

  if (locker.isLoading) {
    return (
      <Page title="จองตู้" wide>
        <div className={splitGridClass}>
          <Skeleton className="lg:col-span-8" />
          <Skeleton className="lg:col-span-4" />
        </div>
      </Page>
    )
  }

  if (locker.isError || !locker.data) {
    return (
      <Page title="จองตู้" wide>
        <ErrorState
          message="โหลดข้อมูลตู้ไม่สำเร็จ"
          hint="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
          onRetry={() => void locker.refetch()}
        />
      </Page>
    )
  }

  const station = locker.data
  const rate = station.rates[size]
  const total = totalPrice(rate, duration)
  const minDate = toDateInput(new Date())
  const maxDate = toDateInput(addDays(new Date(), 7))
  const start = combineLocal(date, time)
  const validStart = !Number.isNaN(start.getTime())
  const end = validStart ? new Date(start.getTime() + duration * 3_600_000) : null
  const conflict = mutation.error instanceof ApiRequestError && mutation.error.status === 409
  const disabled = mutation.isPending || station.available[size] === 0

  function onConfirm() {
    setFormError(null)
    if (!validStart) {
      setFormError('กรุณาเลือกวันและเวลาให้ถูกต้อง')
      return
    }
    if (start.getTime() < Date.now()) {
      setFormError('เลือกเวลาเริ่มต้นในอนาคตเท่านั้น')
      return
    }
    if (start.getTime() > addDays(new Date(), 7).getTime()) {
      setFormError('จองล่วงหน้าได้ไม่เกิน 7 วัน')
      return
    }
    mutation.mutate()
  }

  return (
    <Page wide>
      <button
        type="button"
        className={`${linkButtonClass} -ml-1.5`}
        onClick={() => navigate(`/lockers/${station.id}`)}
      >
        <Icon name="back" className="size-[15px]" />
        ย้อนกลับ
      </button>
      <h1 className="mt-1.5 mb-4 text-[23px] font-bold tracking-[-0.02em] sm:text-[26px]">
        จองตู้
      </h1>

      <SplitLayout
        main={
          <div className="grid gap-3">
            <section className={`${cardClass} bg-elevated p-4`}>
              <div className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-ctl bg-accent text-accent-ink">
                  <Icon name="lock" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold wrap-break-word">{station.name}</h2>
                  <p className="text-sm text-ink-muted wrap-break-word">{station.address}</p>
                </div>
              </div>
            </section>

            <section className={`${cardClass} p-4`}>
              <p className={labelClass}>ขนาดช่อง</p>
              <div className="mt-2.5 grid min-w-0 grid-cols-3 gap-2">
                {SIZES.map((item) => {
                  const empty = station.available[item] === 0
                  const isSelected = size === item
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={empty}
                      onClick={() => setSize(item)}
                      className={`grid min-h-11 min-w-0 justify-items-center gap-0.5 rounded-lg border px-1 py-2 text-sm font-medium ${
                        empty
                          ? 'pointer-events-none border-line text-ink-faint opacity-50'
                          : isSelected
                            ? 'border-accent bg-surface font-semibold text-accent-text'
                            : 'border-line-strong bg-surface text-ink-muted hover:bg-elevated'
                      }`}
                    >
                      {item}
                      <small className="text-center text-[11px] leading-tight font-medium opacity-85">
                        {empty ? 'เต็ม' : `${money(station.rates[item])}/ชม.`}
                      </small>
                    </button>
                  )
                })}
              </div>

              <hr className="my-4 border-line" />

              <p className={labelClass}>เวลาเริ่ม</p>
              <div className="mt-2.5 grid min-w-0 gap-3 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className={labelClass}>วันที่</span>
                  <input
                    className={`${fieldClass} mt-1.5`}
                    type="date"
                    min={minDate}
                    max={maxDate}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>เวลา</span>
                  <input
                    className={`${fieldClass} mt-1.5`}
                    type="time"
                    step={3600}
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  />
                </label>
              </div>

              <label className="mt-3 block">
                <span className={labelClass}>ระยะเวลา</span>
                <div className="relative mt-1.5">
                  <select
                    className={`${fieldClass} cursor-pointer appearance-none pr-9`}
                    value={duration}
                    onChange={(event) => setDuration(Number(event.target.value))}
                  >
                    {Array.from({ length: 24 }, (_, index) => index + 1).map((hours) => (
                      <option key={hours} value={hours}>
                        {hours} ชม.
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="chevron"
                    className="pointer-events-none absolute top-1/2 right-3 size-[15px] -translate-y-1/2 text-ink-faint"
                  />
                </div>
              </label>
            </section>

            {formError ? <ErrorState message={formError} /> : null}

            {mutation.isError ? (
              conflict ? (
                <NoticeCard
                  title="ช่วงเวลานี้ถูกจองแล้ว"
                  message={`${size} ${formatDateTime(start.toISOString())} ถูกจองตัดหน้า`}
                >
                  <button
                    type="button"
                    className={secondaryButtonClass}
                    onClick={() => navigate(`/lockers/${station.id}`)}
                  >
                    ดูช่วงที่ว่าง
                  </button>
                </NoticeCard>
              ) : (
                <ErrorState
                  message={
                    mutation.error instanceof ApiRequestError
                      ? mutation.error.message
                      : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
                  }
                />
              )
            ) : null}
          </div>
        }
        aside={
          <div className={`${cardClass} p-4`}>
            <p className={labelClass}>สรุป</p>
            <dl className="mt-3 grid gap-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">ขนาด</dt>
                <dd className="font-semibold">{size}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">เริ่ม</dt>
                <dd className="font-semibold tabular-nums">
                  {validStart ? formatDateTime(start.toISOString()) : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">สิ้นสุด</dt>
                <dd className="font-semibold tabular-nums">
                  {end ? formatDateTime(end.toISOString()) : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-muted">อัตรา</dt>
                <dd className="font-semibold tabular-nums">
                  {money(rate)} × {duration}
                </dd>
              </div>
            </dl>

            <hr className="my-4 border-line" />

            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink-muted">รวม</span>
              <span className="text-xl font-bold tabular-nums">{money(total)}</span>
            </div>
            {rate * duration < MIN_TOTAL_PRICE ? (
              <p className="mt-1 text-xs text-ink-faint">คิดขั้นต่ำ {money(MIN_TOTAL_PRICE)}</p>
            ) : null}

            <button
              type="button"
              className={`${primaryButtonClass} mt-3.5 hidden w-full lg:inline-flex`}
              disabled={disabled}
              onClick={onConfirm}
            >
              {mutation.isPending ? 'กำลังยืนยัน…' : 'ยืนยันการจอง'}
            </button>
          </div>
        }
      />

      <ActionBar>
        <div className="min-w-0 flex-1">
          <p className={labelClass}>
            {size} · {duration} ชม.
          </p>
          <p className="text-xl font-bold tabular-nums">{money(total)}</p>
        </div>
        <button
          type="button"
          className={`${primaryButtonClass} shrink-0 px-5`}
          disabled={disabled}
          onClick={onConfirm}
        >
          {mutation.isPending ? 'กำลังยืนยัน…' : 'ยืนยัน'}
        </button>
      </ActionBar>
    </Page>
  )
}
