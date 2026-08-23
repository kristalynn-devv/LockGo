import type { Size } from './types'

export const MIN_TOTAL_PRICE = 30

export function totalPrice(ratePerHour: number, durationHours: number): number {
  return Math.max(ratePerHour * durationHours, MIN_TOTAL_PRICE)
}

export function money(value: number): string {
  return `฿${value}`
}

export function formatDistance(km: number | null): string | null {
  if (km == null) {
    return null
  }
  if (km < 1) {
    return `${Math.round(km * 1000)} m`
  }
  return `${km.toFixed(1)} km`
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export function formatTimeRange(startIso: string, endIso: string): string {
  const time = new Intl.DateTimeFormat('th-TH', { timeStyle: 'short' })
  const date = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' })
  const start = new Date(startIso)
  const end = new Date(endIso)
  return `${date.format(start)} · ${time.format(start)}–${time.format(end)}`
}

export function nextHour(at = new Date()): Date {
  const value = new Date(at)
  value.setMinutes(0, 0, 0)
  value.setHours(value.getHours() + 1)
  return value
}

/** วันที่แรกที่จองได้ - ถ้าชั่วโมงถัดไปข้ามวัน จะเป็นพรุ่งนี้ ไม่ใช่วันนี้ */
export function earliestBookingDate(at = new Date()): string {
  return toDateInput(nextHour(at))
}

export function latestBookingDate(at = new Date()): string {
  return toDateInput(addDays(at, 7))
}

export type TimeRange = { start: string; end: string }

/** ชั่วโมงที่เลือกได้ในวันนั้น ทีละ 1 ชม. ตาม U-03 - ไม่รวมเวลาที่ผ่านไปแล้ว */
export function hourOptions(date: string, at = new Date()): { value: string; label: string }[] {
  const earliest = nextHour(at)
  const earliestDate = toDateInput(earliest)
  if (date < earliestDate) {
    return []
  }
  const minHour = date === earliestDate ? earliest.getHours() : 0
  return Array.from({ length: 24 - minHour }, (_, index) => {
    const hour = minHour + index
    const value = `${String(hour).padStart(2, '0')}:00`
    return { value, label: value }
  })
}

/** ชั่วโมงเริ่มที่ยังว่างพอสำหรับระยะที่เลือก - ช่วงที่ถูกจองแล้วตัดออก */
export function bookableHours(
  date: string,
  ranges: TimeRange[],
  durationHours: number,
  at = new Date(),
): { value: string; label: string }[] {
  const earliest = nextHour(at)
  if (date < toDateInput(earliest) || durationHours < 1) {
    return []
  }

  const durationMs = durationHours * 3_600_000
  const values = new Set<string>()

  for (const range of ranges) {
    const rangeStart = new Date(range.start)
    const rangeEnd = new Date(range.end)
    const cursor = new Date(rangeStart)
    cursor.setMinutes(0, 0, 0)
    if (cursor < rangeStart) {
      cursor.setHours(cursor.getHours() + 1)
    }

    while (cursor.getTime() + durationMs <= rangeEnd.getTime()) {
      const day = toDateInput(cursor)
      if (day > date) {
        break
      }
      if (day === date && cursor >= earliest) {
        values.add(toTimeInput(cursor))
      }
      cursor.setHours(cursor.getHours() + 1)
    }
  }

  return [...values].sort().map((value) => ({ value, label: value }))
}

export function bookableDates(
  ranges: TimeRange[],
  durationHours: number,
  minDate: string,
  maxDate: string,
  at = new Date(),
): Set<string> {
  const dates = new Set<string>()
  const cursor = parseDateInput(minDate)
  const last = parseDateInput(maxDate)
  while (cursor <= last) {
    const iso = toDateInput(cursor)
    if (bookableHours(iso, ranges, durationHours, at).length > 0) {
      dates.add(iso)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function groupRangesByDay(ranges: TimeRange[]) {
  const groups: { date: string; label: string; slots: { start: string; end: string; time: string }[] }[] =
    []
  const dateFmt = new Intl.DateTimeFormat('th-TH', { dateStyle: 'medium' })
  const timeFmt = new Intl.DateTimeFormat('th-TH', { timeStyle: 'short' })

  for (const range of ranges) {
    const start = new Date(range.start)
    const end = new Date(range.end)
    const date = toDateInput(start)
    const last = groups[groups.length - 1]
    const slot = {
      start: range.start,
      end: range.end,
      time: `${timeFmt.format(start)}–${timeFmt.format(end)}`,
    }
    if (last?.date === date) {
      last.slots.push(slot)
    } else {
      groups.push({ date, label: dateFmt.format(start), slots: [slot] })
    }
  }

  return groups
}

function parseDateInput(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

export function toDateInput(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function toTimeInput(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:00`
}

export function combineLocal(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`)
}

export function shortSize(size: Size): string {
  return size[0] ?? size
}

export function availabilityTone(count: number): string {
  if (count === 0) return 'bg-danger-soft text-danger'
  if (count <= 2) return 'bg-warn-soft text-warn'
  return 'bg-ok-soft text-ok'
}

export function statusTone(status: string): string {
  if (status === 'Reserved') return 'bg-accent-soft text-accent-text'
  if (status === 'Active' || status === 'Open') return 'bg-ok-soft text-ok'
  if (status === 'Expired') return 'bg-danger-soft text-danger'
  if (status === 'Maintenance') return 'bg-warn-soft text-warn'
  return 'bg-elevated text-ink-muted'
}

const STATUS_LABELS: Record<string, string> = {
  Open: 'เปิด',
  Closed: 'ปิด',
  Maintenance: 'ซ่อมบำรุง',
  Reserved: 'จองอยู่',
  Active: 'ใช้งานอยู่',
  Completed: 'เสร็จแล้ว',
  Cancelled: 'ยกเลิกแล้ว',
  Expired: 'หมดอายุ',
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function authErrorMessage(message: string): string {
  const lower = message.toLowerCase()
  if (lower.includes('invalid login')) {
    return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  }
  if (lower.includes('email not confirmed')) {
    return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'
  }
  return 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่'
}
