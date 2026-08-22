import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listLockers, listLocations } from '../lib/api'
import { useAuth } from '../lib/auth'
import {
  availabilityTone,
  formatDistance,
  money,
  shortSize,
  statusTone,
} from '../lib/format'
import { SIZES, type LockerFilters } from '../lib/types'
import { fieldClass, Page } from '../ui/Page'
import { Badge, EmptyState, ErrorState, Skeleton } from '../ui/states'

const emptyFilters: LockerFilters = {
  location: '',
  distance: '',
  size: '',
  price: '',
  availableOnly: true,
}

export function FindPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [filters, setFilters] = useState<LockerFilters>(emptyFilters)

  const locations = useQuery({
    queryKey: ['lockers', 'locations'],
    queryFn: () => listLocations(token),
    enabled: Boolean(token),
  })

  const lockers = useQuery({
    queryKey: ['lockers', 'list', filters],
    queryFn: () =>
      listLockers(token, {
        location: filters.location || undefined,
        distance: filters.distance || undefined,
        size: filters.size || undefined,
        price: filters.price || undefined,
        available_only: filters.availableOnly ? 'true' : undefined,
      }),
    enabled: Boolean(token),
  })

  return (
    <Page wide>
      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">ค้นหาสถานที่</span>
          <select
            className={fieldClass}
            value={filters.location}
            onChange={(event) =>
              setFilters((current) => ({ ...current, location: event.target.value }))
            }
          >
            <option value="">ค้นหาสถานที่</option>
            {(locations.data?.items ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2 overflow-x-auto sm:flex-wrap">
          <select
            className={`${fieldClass} min-w-28`}
            value={filters.distance}
            onChange={(event) =>
              setFilters((current) => ({ ...current, distance: event.target.value }))
            }
          >
            <option value="">ระยะทาง</option>
            <option value="1">1 km</option>
            <option value="2">2 km</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
          </select>
          <select
            className={`${fieldClass} min-w-28`}
            value={filters.size}
            onChange={(event) =>
              setFilters((current) => ({ ...current, size: event.target.value }))
            }
          >
            <option value="">ขนาด</option>
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <select
            className={`${fieldClass} min-w-28`}
            value={filters.price}
            onChange={(event) =>
              setFilters((current) => ({ ...current, price: event.target.value }))
            }
          >
            <option value="">ราคา</option>
            <option value="30">ถึง ฿30</option>
            <option value="45">ถึง ฿45</option>
            <option value="60">ถึง ฿60</option>
            <option value="90">ถึง ฿90</option>
          </select>
          <label className="flex min-w-28 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={filters.availableOnly}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  availableOnly: event.target.checked,
                }))
              }
            />
            ว่าง
          </label>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {lockers.isLoading ? (
          <>
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </>
        ) : null}

        {lockers.isError ? (
          <ErrorState
            message="โหลดรายการตู้ไม่สำเร็จ"
            onRetry={() => void lockers.refetch()}
          />
        ) : null}

        {lockers.data && lockers.data.items.length === 0 ? (
          <EmptyState
            message="ไม่พบ Locker ที่ตรงกับเงื่อนไข"
            actionLabel="ล้างตัวกรอง"
            onAction={() => setFilters(emptyFilters)}
          />
        ) : null}

        {lockers.data?.items.map((item) => {
          const distance = formatDistance(item.distance_km)
          return (
            <Link
              key={item.id}
              to={`/lockers/${item.id}`}
              className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-300 hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
                <Badge tone={statusTone(item.status)}>{item.status === 'Open' ? 'เปิด' : item.status}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {distance ? `${distance} · ` : ''}
                {item.address}
              </p>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                {item.availability_mode === 'window' ? 'ว่างตามเวลาที่เลือก' : 'ว่างตอนนี้'}
              </p>
              <div className="mt-2 flex gap-2">
                {SIZES.map((size) => (
                  <Badge key={size} tone={availabilityTone(item.available[size])}>
                    {`${shortSize(size)} ${item.available[size]}`}
                  </Badge>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xl font-bold text-slate-900">
                  เริ่มต้น {money(item.starting_price)}
                </p>
                <span className="text-sm font-medium text-indigo-600">เลือก →</span>
              </div>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
