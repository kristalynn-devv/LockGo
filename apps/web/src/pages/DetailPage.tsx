import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLocker } from '../lib/api'
import { useAuth } from '../lib/auth'
import { availabilityTone, groupRangesByDay, money, statusLabel, statusTone } from '../lib/format'
import { SIZES, type Size } from '../lib/types'
import { Icon } from '../ui/icons'
import {
  ActionBar,
  cardClass,
  compactButtonClass,
  labelClass,
  linkButtonClass,
  Page,
  pageTitleClass,
  priceClass,
  primaryButtonClass,
  splitGridClass,
  SplitLayout,
} from '../ui/Page'
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
      <Page wide>
        <div className={splitGridClass}>
          <Skeleton className="lg:col-span-8" />
          <Skeleton className="lg:col-span-4" />
        </div>
      </Page>
    )
  }

  if (locker.isError) {
    return (
      <Page title="รายละเอียดตู้" wide>
        <ErrorState
          message="โหลดรายละเอียดตู้ไม่สำเร็จ"
          hint="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
          onRetry={() => void locker.refetch()}
        />
      </Page>
    )
  }

  if (!locker.data) {
    return (
      <Page title="รายละเอียดตู้" wide>
        <EmptyState
          message="ไม่พบตู้ที่ต้องการ"
          actionLabel="กลับไปค้นหา"
          onAction={() => navigate('/')}
        />
      </Page>
    )
  }

  const station = locker.data
  const selected = size ?? SIZES.find((item) => station.available_time[item].length > 0) ?? null
  const selectedAvailable = selected ? station.available[selected] : 0
  const selectedRanges = selected ? station.available_time[selected] : []
  const canReserve = Boolean(selected && selectedRanges.length > 0)

  return (
    <Page wide>
      <button type="button" className={`${linkButtonClass} -ml-1.5`} onClick={() => navigate('/')}>
        <Icon name="back" className="size-[15px]" />
        ค้นหา
      </button>

      <div className="mt-2">
        <SplitLayout
          main={
            <div className="grid gap-3">
              <section className={`${cardClass} rise p-4`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h1 className={pageTitleClass}>
                      {station.name}
                    </h1>
                    <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink-muted">
                      <Icon name="pin" className="mt-0.5 size-4 shrink-0" />
                      <span className="min-w-0 wrap-break-word">{station.address}</span>
                    </p>
                    <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
                      <Icon name="clock" className="size-4 shrink-0" />
                      {station.operating_hours === '24 hours' ? 'เปิด 24 ชั่วโมง' : station.operating_hours}
                    </p>
                  </div>
                  <Badge tone={statusTone(station.status)}>{statusLabel(station.status)}</Badge>
                </div>
              </section>

              {selected ? (
                <section className={`${cardClass} p-4`}>
                  <p className={labelClass}>ช่วงที่ว่าง · {selected}</p>
                  {selectedRanges.length === 0 ? (
                    <p className="mt-2.5 text-sm text-ink-muted">ไม่มีช่วงว่างใน 7 วัน</p>
                  ) : (
                    <div className="mt-2.5 grid gap-3">
                      {groupRangesByDay(selectedRanges).map((group) => (
                        <div key={group.date}>
                          <p className="text-sm font-medium">{group.label}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {group.slots.map((slot) => (
                              <span
                                key={`${slot.start}-${slot.end}`}
                                className="rounded-full border border-line bg-elevated px-3 py-1.5 text-xs tabular-nums"
                              >
                                {slot.time}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ) : null}
            </div>
          }
          aside={
            <div className={`${cardClass} p-4`}>
              <p className={labelClass}>ขนาดช่อง</p>

              <div className="mt-2.5 grid gap-2.5">
                {SIZES.map((item) => {
                  const count = station.available[item]
                  const future = station.available_time[item].length > 0
                  const disabled = !future
                  const isSelected = selected === item
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={disabled}
                      onClick={() => setSize(item)}
                      className={`relative min-h-11 w-full rounded-lg border p-3.5 text-left transition-colors ${disabled
                          ? 'pointer-events-none border-line opacity-50'
                          : isSelected
                            ? 'border-accent bg-accent-soft ring-2 ring-accent'
                            : 'border-line bg-surface hover:bg-elevated'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-elevated text-ink-muted">
                          <Icon name="box" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <b className="text-sm font-semibold">{item}</b>
                            <Badge tone={availabilityTone(count)}>
                              {count === 0 ? (future ? 'เต็มตอนนี้' : 'เต็ม') : `ว่าง ${count}`}
                            </Badge>
                          </div>
                          <p className="text-sm text-ink-muted">
                            {money(station.rates[item])} / ชม.
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>

              <hr className="my-4 border-line" />

              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-ink-muted">เริ่มต้น</span>
                <span className={priceClass}>
                  {money(station.starting_price)}
                </span>
              </div>

              <button
                type="button"
                className={`${primaryButtonClass} mt-3.5 hidden w-full lg:inline-flex`}
                disabled={!canReserve}
                onClick={() => navigate(`/lockers/${station.id}/reserve?size=${selected}`)}
              >
                เลือกขนาดนี้
                <Icon name="arrow" className="size-[15px]" />
              </button>
            </div>
          }
        />
      </div>

      <ActionBar>
        <div className="min-w-0 flex-1">
          <p className={labelClass}>
            {selected ?? '-'} · {selectedAvailable === 0 ? (selectedRanges.length > 0 ? 'เต็มตอนนี้' : 'เต็ม') : `ว่าง ${selectedAvailable}`}
          </p>
          <p className={priceClass}>
            {selected ? money(station.rates[selected]) : money(station.starting_price)}
            <span className="ml-1 text-xs font-medium text-ink-muted">/ ชม.</span>
          </p>
        </div>
        <button
          type="button"
          className={compactButtonClass}
          disabled={!canReserve}
          onClick={() => navigate(`/lockers/${station.id}/reserve?size=${selected}`)}
        >
          เลือก
        </button>
      </ActionBar>
    </Page>
  )
}
