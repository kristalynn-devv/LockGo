import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ApiRequestError, createReservation, getLocker } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  addDays,
  combineLocal,
  MIN_TOTAL_PRICE,
  money,
  nextHour,
  toDateInput,
  toTimeInput,
  totalPrice,
} from '../lib/format'
import { SIZES, type Size } from '../lib/types'
import { fieldClass, Page, primaryButtonClass } from '../ui/Page'
import { ErrorState, Skeleton } from '../ui/states'

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
      <Page title="จองตู้">
        <Skeleton className="h-64" />
      </Page>
    )
  }

  if (locker.isError || !locker.data) {
    return (
      <Page title="จองตู้">
        <ErrorState message="โหลดข้อมูลตู้ไม่สำเร็จ" onRetry={() => void locker.refetch()} />
      </Page>
    )
  }

  const station = locker.data
  const rate = station.rates[size]
  const total = totalPrice(rate, duration)
  const minDate = toDateInput(new Date())
  const maxDate = toDateInput(addDays(new Date(), 7))
  const conflict =
    mutation.error instanceof ApiRequestError && mutation.error.status === 409

  function onConfirm() {
    setFormError(null)
    const start = combineLocal(date, time)
    if (Number.isNaN(start.getTime())) {
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
    <Page title="จองตู้">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-lg font-semibold text-slate-900">{station.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{station.address}</p>
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-slate-500">
        เลือกขนาด
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {SIZES.map((item) => {
          const empty = station.available[item] === 0
          return (
            <button
              key={item}
              type="button"
              disabled={empty}
              onClick={() => setSize(item)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                empty
                  ? 'pointer-events-none border-slate-200 text-slate-400 opacity-50'
                  : size === item
                    ? 'border-indigo-600 text-indigo-700 ring-2 ring-indigo-600'
                    : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              {item}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">วันที่</span>
          <input
            className={`${fieldClass} mt-1`}
            type="date"
            min={minDate}
            max={maxDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
        <label>
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">เวลาเริ่ม</span>
          <input
            className={`${fieldClass} mt-1`}
            type="time"
            step={3600}
            value={time}
            onChange={(event) => setTime(event.target.value)}
          />
        </label>
      </div>

      <label className="mt-3 block">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">ระยะเวลา</span>
        <select
          className={`${fieldClass} mt-1`}
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
        >
          {Array.from({ length: 24 }, (_, index) => index + 1).map((hours) => (
            <option key={hours} value={hours}>
              {hours} ชม.
            </option>
          ))}
        </select>
      </label>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <div className="flex justify-between text-sm text-slate-600">
          <span>ราคา</span>
          <span>
            {money(rate)} × {duration} ชม.
          </span>
        </div>
        <div className="mt-2 flex justify-between">
          <span className="text-sm text-slate-600">รวม</span>
          <span className="text-xl font-bold text-slate-900">{money(total)}</span>
        </div>
        {rate * duration < MIN_TOTAL_PRICE ? (
          <p className="mt-1 text-xs text-slate-400">คิดขั้นต่ำ ฿30</p>
        ) : null}
      </div>

      {formError ? <div className="mt-4"><ErrorState message={formError} /></div> : null}

      {mutation.isError ? (
        <div className="mt-4">
          <ErrorState
            message={
              mutation.error instanceof ApiRequestError
                ? mutation.error.message
                : 'เกิดข้อผิดพลาด กรุณาลองใหม่'
            }
          />
          {conflict ? (
            <Link
              to={`/lockers/${station.id}`}
              className="mt-2 inline-block text-sm font-medium text-indigo-600"
            >
              เลือกเวลาหรือขนาดใหม่
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={`${primaryButtonClass} mt-6`}
        disabled={mutation.isPending || station.available[size] === 0}
        onClick={onConfirm}
      >
        {mutation.isPending ? 'กำลังยืนยัน…' : 'ยืนยันการจอง'}
      </button>
    </Page>
  )
}
