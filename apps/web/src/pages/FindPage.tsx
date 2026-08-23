import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLockers, listLocations } from '../lib/api'
import { useAuth } from '../lib/auth'
import { availabilityTone, formatDistance, money, shortSize, statusTone } from '../lib/format'
import { SIZES, type LocationItem, type LockerFilters } from '../lib/types'
import { Icon } from '../ui/icons'
import {
  cardClass,
  cardGridClass,
  fieldClass,
  labelClass,
  linkButtonClass,
  Page,
} from '../ui/Page'
import { Badge, EmptyState, ErrorState, SkeletonList } from '../ui/states'

const emptyFilters: LockerFilters = {
  location: '',
  distance: '',
  size: '',
  price: '',
  availableOnly: true,
}

const DISTANCES = ['1', '2', '5', '10']
const PRICES = ['30', '45', '60', '90']

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-10 rounded-full border px-3 text-sm ${
        pressed
          ? 'border-accent bg-accent-soft font-medium text-accent-text'
          : 'border-line-strong bg-surface text-ink-muted hover:bg-elevated'
      }`}
    >
      {children}
    </button>
  )
}

function toggle(current: string, next: string) {
  return current === next ? '' : next
}

export function FindPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [filters, setFilters] = useState<LockerFilters>(emptyFilters)
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState<LocationItem | null>(null)
  const [open, setOpen] = useState(false)

  const patch = (next: Partial<LockerFilters>) =>
    setFilters((current) => ({ ...current, ...next }))

  const locations = useQuery({
    queryKey: ['lockers', 'locations'],
    queryFn: () => listLocations(token),
    enabled: Boolean(token),
  })

  const lockers = useQuery({
    queryKey: ['lockers', 'list', { ...filters, location: origin?.id ?? '' }],
    queryFn: () =>
      listLockers(token, {
        location: origin?.id || undefined,
        distance: filters.distance || undefined,
        size: filters.size || undefined,
        price: filters.price || undefined,
        available_only: filters.availableOnly ? 'true' : undefined,
      }),
    enabled: Boolean(token),
  })

  const needle = search.trim().toLowerCase()
  const suggestions = useMemo(() => {
    const places = locations.data?.items ?? []
    if (!needle || origin) return []
    return places.filter((place) => place.name.toLowerCase().includes(needle)).slice(0, 6)
  }, [locations.data?.items, needle, origin])

  const items = useMemo(() => {
    const rows = lockers.data?.items ?? []
    if (origin || !needle) return rows
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.address.toLowerCase().includes(needle),
    )
  }, [lockers.data?.items, needle, origin])

  const dirty =
    Boolean(search || origin || filters.distance || filters.size || filters.price) ||
    !filters.availableOnly

  function reset() {
    setFilters(emptyFilters)
    setSearch('')
    setOrigin(null)
    setOpen(false)
  }

  function pickPlace(place: LocationItem) {
    setOrigin(place)
    setSearch(place.name)
    setOpen(false)
  }

  function onSearchChange(value: string) {
    setSearch(value)
    setOrigin(null)
    setOpen(true)
  }

  return (
    <Page wide>
      <div className="relative mb-4">
        <label className="sr-only" htmlFor="locker-search">
          ค้นหาสถานี
        </label>
        <Icon
          name="search"
          className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-ink-faint"
        />
        <input
          id="locker-search"
          className={`${fieldClass} pr-10 pl-10`}
          type="text"
          role="searchbox"
          placeholder="ค้นหาชื่อสถานีหรือที่อยู่"
          value={search}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => onSearchChange(event.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpen(false)
              event.currentTarget.blur()
            }
            if (event.key === 'Enter' && suggestions[0]) {
              event.preventDefault()
              pickPlace(suggestions[0])
            }
          }}
        />
        {search ? (
          <button
            type="button"
            aria-label="ล้างคำค้น"
            className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center text-ink-faint hover:text-ink"
            onClick={() => onSearchChange('')}
          >
            <Icon name="close" className="size-4" />
          </button>
        ) : null}

        {open && suggestions.length > 0 ? (
          <ul
            className={`${cardClass} absolute inset-x-0 top-[calc(100%+6px)] z-30 overflow-hidden py-1`}
            role="listbox"
          >
            {suggestions.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-elevated"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pickPlace(place)}
                >
                  <Icon name="pin" className="size-4 text-ink-faint" />
                  <span>{place.name}</span>
                  <span className="ml-auto text-xs text-ink-faint">จุดอ้างอิงระยะทาง</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {DISTANCES.map((value) => (
          <Chip
            key={value}
            pressed={filters.distance === value}
            onClick={() => patch({ distance: toggle(filters.distance, value) })}
          >
            {value} km
          </Chip>
        ))}
        {SIZES.map((size) => (
          <Chip
            key={size}
            pressed={filters.size === size}
            onClick={() => patch({ size: toggle(filters.size, size) })}
          >
            {size}
          </Chip>
        ))}
        {PRICES.map((value) => (
          <Chip
            key={value}
            pressed={filters.price === value}
            onClick={() => patch({ price: toggle(filters.price, value) })}
          >
            ไม่เกิน ฿{value}
          </Chip>
        ))}
        <Chip
          pressed={filters.availableOnly}
          onClick={() => patch({ availableOnly: !filters.availableOnly })}
        >
          ว่างเท่านั้น
        </Chip>
        {dirty ? (
          <button type="button" className={linkButtonClass} onClick={reset}>
            ล้างทั้งหมด
          </button>
        ) : null}
      </div>

      {origin ? (
        <p className="mb-3 text-sm text-ink-muted">
          เรียงจากระยะทางใกล้ {origin.name}
        </p>
      ) : null}

      {lockers.isSuccess ? (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold">{items.length} สถานี</p>
          <p className="text-sm text-ink-muted">
            {origin ? 'ใกล้ที่สุดก่อน' : 'ตรงกับคำค้น'}
          </p>
        </div>
      ) : null}

      {lockers.isLoading ? <SkeletonList count={4} /> : null}

      {lockers.isError ? (
        <ErrorState
          message="โหลดรายการตู้ไม่สำเร็จ"
          hint="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
          onRetry={() => void lockers.refetch()}
        />
      ) : null}

      {lockers.isSuccess && items.length === 0 ? (
        <EmptyState
          message="ไม่พบตู้ที่ตรงเงื่อนไข"
          hint="ลองพิมพ์ชื่อสถานี หรือล้างตัวกรอง"
          secondaryLabel="ขยายเป็น 5 km"
          onSecondary={() => patch({ distance: '5' })}
          actionLabel="ล้างทั้งหมด"
          onAction={reset}
        />
      ) : null}

      <div className={cardGridClass}>
        {items.map((item) => {
          const distance = formatDistance(item.distance_km)
          return (
            <Link key={item.id} to={`/lockers/${item.id}`} className={`${cardClass} block p-4 hover:bg-elevated`}>
              <div className="flex items-start justify-between gap-2.5">
                <h2 className="min-w-0 text-base font-semibold">{item.name}</h2>
                <Badge tone={statusTone(item.status)}>
                  {item.status === 'Open' ? 'เปิด' : item.status}
                </Badge>
              </div>

              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
                <Icon name="pin" className="size-4" />
                <span className="truncate">
                  {distance ? `${distance} · ` : ''}
                  {item.address}
                </span>
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {SIZES.map((size) => (
                  <Badge key={size} tone={availabilityTone(item.available[size])}>
                    {`${shortSize(size)} ${item.available[size]}`}
                  </Badge>
                ))}
              </div>

              <div className="mt-3.5 flex items-end justify-between gap-2.5 border-t border-line pt-3">
                <div>
                  <p className={labelClass}>เริ่มต้น</p>
                  <p className="text-xl font-bold tabular-nums">{money(item.starting_price)}</p>
                </div>
                <span className="text-sm font-medium text-accent-text">เลือก</span>
              </div>
            </Link>
          )
        })}
      </div>
    </Page>
  )
}
