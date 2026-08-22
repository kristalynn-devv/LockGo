import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getLocker } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  availabilityTone,
  formatTimeRange,
  money,
  statusTone,
} from '../lib/format'
import { SIZES, type Size } from '../lib/types'
import { Page, primaryButtonClass } from '../ui/Page'
import { Badge, EmptyState, ErrorState, Skeleton } from '../ui/states'

export function DetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [size, setSize] = useState<Size | null>(null)

  const locker = useQuery({
    queryKey: ['lockers', 'detail', id],
    queryFn: () => getLocker(token, id),
    enabled: Boolean(token && id),
  })

  if (locker.isLoading) {
    return (
      <Page>
        <Skeleton className="h-64" />
      </Page>
    )
  }

  if (locker.isError) {
    return (
      <Page title="รายละเอียดตู้">
        <ErrorState message="โหลดรายละเอียดตู้ไม่สำเร็จ" onRetry={() => void locker.refetch()} />
      </Page>
    )
  }

  if (!locker.data) {
    return (
      <Page title="รายละเอียดตู้">
        <EmptyState message="ไม่พบตู้ที่ต้องการ" actionLabel="กลับไปค้นหา" onAction={() => navigate('/')} />
      </Page>
    )
  }

  const station = locker.data
  const selectedAvailable = size ? station.available[size] : 0

  return (
    <Page>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{station.name}</h1>
          <Badge tone={statusTone(station.status)}>
            {station.status === 'Open' ? 'เปิด' : station.status}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-slate-600">{station.address}</p>
        <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
          เวลาทำการ
        </p>
        <p className="text-sm text-slate-600">{station.operating_hours}</p>
      </div>

      <div className="mt-4 space-y-3">
        {SIZES.map((item) => {
          const count = station.available[item]
          const disabled = count === 0
          const selected = size === item
          return (
            <button
              key={item}
              type="button"
              disabled={disabled}
              onClick={() => setSize(item)}
              className={`w-full rounded-lg border bg-white p-4 text-left shadow-sm transition-colors ${
                disabled
                  ? 'pointer-events-none border-slate-200 opacity-50'
                  : selected
                    ? 'border-indigo-600 ring-2 ring-indigo-600'
                    : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-900">{item}</p>
                <Badge tone={availabilityTone(count)}>{`ว่าง ${count}`}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {money(station.rates[item])} / ชม.
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Available Time
              </p>
              <ul className="mt-1 space-y-1 text-sm text-slate-600">
                {station.available_time[item].length === 0 ? (
                  <li>ไม่มีช่วงว่างใน 7 วัน</li>
                ) : (
                  station.available_time[item].map((slot) => (
                    <li key={`${slot.start}-${slot.end}`}>
                      {formatTimeRange(slot.start, slot.end)}
                    </li>
                  ))
                )}
              </ul>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className={`${primaryButtonClass} mt-6`}
        disabled={!size || selectedAvailable === 0}
        onClick={() => navigate(`/lockers/${station.id}/reserve?size=${size}`)}
      >
        เลือกขนาดนี้
      </button>
      <Link to="/" className="mt-3 block text-center text-sm font-medium text-indigo-600">
        กลับไปค้นหา
      </Link>
    </Page>
  )
}
