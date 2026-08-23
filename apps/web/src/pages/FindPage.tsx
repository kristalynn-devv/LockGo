import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listLockers, listLocations } from '../lib/api'
import { useAuth } from '../lib/auth'
import { availabilityTone, formatDistance, money, shortSize, statusTone } from '../lib/format'
import { SIZES, type LocationItem, type LockerFilters, type LockerSort } from '../lib/types'
import { Icon } from '../ui/icons'
import {
  cardClass,
  cardGridClass,
  labelClass,
  linkButtonClass,
  Page,
} from '../ui/Page'
import { MenuSelect } from '../ui/MenuSelect'
import { Badge, Chip, EmptyState, ErrorState, SkeletonList } from '../ui/states'

const HERE_ID = 'here'

const emptyFilters: LockerFilters = {
  location: '',
  distance: '',
  size: '',
  price: '',
  availableOnly: true,
  sort: 'nearest',
}

const DISTANCES = [
  { value: '', label: 'ทั้งหมด' },
  { value: '1', label: '1 km' },
  { value: '2', label: '2 km' },
  { value: '5', label: '5 km' },
  { value: '10', label: '10 km' },
]
const PRICE_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: '30', label: 'ไม่เกิน ฿30' },
  { value: '45', label: 'ไม่เกิน ฿45' },
  { value: '60', label: 'ไม่เกิน ฿60' },
  { value: '90', label: 'ไม่เกิน ฿90' },
]
const SIZE_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  ...SIZES.map((size) => ({ value: size, label: size })),
]
const SORT_OPTIONS: { value: LockerSort; label: string }[] = [
  { value: 'nearest', label: 'ใกล้สุด' },
  { value: 'price', label: 'ถูกสุด' },
  { value: 'available', label: 'ว่างมากสุด' },
]

export function FindPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const [filters, setFilters] = useState<LockerFilters>(emptyFilters)
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState<LocationItem | null>(null)
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)

  const patch = (next: Partial<LockerFilters>) =>
    setFilters((current) => ({ ...current, ...next }))

  const locations = useQuery({
    queryKey: ['lockers', 'locations'],
    queryFn: () => listLocations(token),
    enabled: Boolean(token),
  })

  const usingHere = origin?.id === HERE_ID
  const lockers = useQuery({
    queryKey: [
      'lockers',
      'list',
      {
        ...filters,
        location: usingHere ? '' : (origin?.id ?? ''),
        latitude: usingHere ? origin?.latitude : '',
        longitude: usingHere ? origin?.longitude : '',
      },
    ],
    queryFn: () =>
      listLockers(token, {
        location: origin && !usingHere ? origin.id : undefined,
        latitude: usingHere && origin ? String(origin.latitude) : undefined,
        longitude: usingHere && origin ? String(origin.longitude) : undefined,
        distance: filters.distance || undefined,
        size: filters.size || undefined,
        price: filters.price || undefined,
        available_only: filters.availableOnly ? 'true' : undefined,
        sort: filters.sort,
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

  const extraCount = [
    filters.distance,
    filters.size,
    filters.price,
    filters.sort !== 'nearest' ? 'sort' : '',
    filters.availableOnly ? '' : 'available',
  ].filter(Boolean).length

  const dirty =
    Boolean(search || origin || filters.distance || filters.size || filters.price) ||
    !filters.availableOnly ||
    filters.sort !== 'nearest'

  function reset() {
    setFilters(emptyFilters)
    setSearch('')
    setOrigin(null)
    setOpen(false)
    setGeoError(null)
  }

  function pickPlace(place: LocationItem) {
    setOrigin(place)
    setSearch(place.name)
    setOpen(false)
    setGeoError(null)
  }

  function clearHere() {
    setOrigin(null)
    setGeoError(null)
    setLocating(false)
    if (search === 'ตำแหน่งปัจจุบัน') {
      setSearch('')
    }
  }

  function locateHere() {
    if (usingHere || locating) {
      clearHere()
      return
    }
    if (!navigator.geolocation) {
      setGeoError('เบราว์เซอร์นี้ไม่รองรับตำแหน่งปัจจุบัน — เลือกสถานที่จากรายการได้')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        pickPlace({
          id: HERE_ID,
          name: 'ตำแหน่งปัจจุบัน',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocating(false)
      },
      () => {
        setGeoError('ไม่ได้รับอนุญาตตำแหน่ง — เลือกสถานที่จากรายการได้')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    )
  }

  function onSearchChange(value: string) {
    setSearch(value)
    setOrigin(null)
    setOpen(true)
  }

  const sortLabel =
    filters.sort === 'price'
      ? 'ราคาเริ่มต้นต่ำก่อน'
      : filters.sort === 'available'
        ? 'ช่องว่างมากก่อน'
        : origin
          ? `ใกล้ ${origin.name}`
          : 'เลือกสถานที่หรือใกล้ฉัน เพื่อเรียงระยะทาง'

  return (
    <Page wide>
      <section className={`${cardClass} mb-3 p-2.5`}>
        <div className="flex overflow-hidden rounded-lg border border-line bg-elevated/40 focus-within:border-accent">
          <div className="relative min-w-0 flex-1">
            <label className="sr-only" htmlFor="locker-search">
              ค้นหาสถานี
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute top-1/2 left-2.5 z-10 size-3.5 -translate-y-1/2 text-ink-faint"
            />
            <input
              id="locker-search"
              className="h-10 w-full min-w-0 border-0 bg-transparent pr-9 pl-8 text-sm text-ink outline-none placeholder:text-ink-faint"
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
                className={`${cardClass} absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden py-1`}
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
          <button
            type="button"
            aria-label="ใกล้ฉัน"
            aria-pressed={usingHere}
            className={`inline-flex shrink-0 items-center gap-1 border-l px-2.5 text-xs transition-colors ${
              usingHere
                ? 'border-accent bg-accent-soft font-medium text-accent-text'
                : 'border-line-strong text-ink-muted hover:bg-elevated'
            }`}
            onClick={locateHere}
          >
            <Icon name="pin" className="size-3.5" />
            <span>{locating ? 'กำลังหา…' : 'ใกล้ฉัน'}</span>
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={moreOpen}
            className="inline-flex h-8 items-center gap-1 text-xs font-medium text-accent-text"
            onClick={() => setMoreOpen((open) => !open)}
          >
            ตัวกรอง
            {extraCount > 0 ? (
              <span className="inline-flex min-w-4 items-center justify-center rounded-full bg-accent-soft px-1 text-[10px] font-semibold">
                {extraCount}
              </span>
            ) : null}
            <Icon
              name="chevron"
              className={`size-3.5 ${moreOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {dirty ? (
            <button type="button" className={`${linkButtonClass} min-h-8 text-xs`} onClick={reset}>
              ล้างทั้งหมด
            </button>
          ) : null}
        </div>

        {moreOpen ? (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <MenuSelect
              label="ระยะ"
              value={filters.distance}
              options={DISTANCES}
              marked={Boolean(filters.distance)}
              onChange={(value) => patch({ distance: value })}
            />
            <MenuSelect
              label="ขนาด"
              value={filters.size}
              options={SIZE_OPTIONS}
              marked={Boolean(filters.size)}
              onChange={(value) => patch({ size: value })}
            />
            <MenuSelect
              label="ราคา"
              value={filters.price}
              options={PRICE_OPTIONS}
              marked={Boolean(filters.price)}
              onChange={(value) => patch({ price: value })}
            />
            <MenuSelect
              label="เรียง"
              value={filters.sort}
              options={SORT_OPTIONS}
              marked={filters.sort !== 'nearest'}
              onChange={(value) => patch({ sort: value as LockerSort })}
            />
            <Chip
              compact
              switchRole
              pressed={filters.availableOnly}
              onClick={() => patch({ availableOnly: !filters.availableOnly })}
            >
              ว่างเท่านั้น
            </Chip>
          </div>
        ) : null}
      </section>

      {geoError ? <p className="mb-3 text-sm text-ink-muted">{geoError}</p> : null}

      {lockers.isSuccess ? (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold">{items.length} สถานี</p>
          <p className="text-sm text-ink-muted">{sortLabel}</p>
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
          onSecondary={() => {
            setMoreOpen(true)
            patch({ distance: '5' })
          }}
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
