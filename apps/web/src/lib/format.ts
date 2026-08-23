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

export function nextHour(): Date {
  const value = new Date()
  value.setMinutes(0, 0, 0)
  value.setHours(value.getHours() + 1)
  return value
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

export function sizeLabel(size: Size): string {
  if (size === 'Small') return 'Small'
  if (size === 'Medium') return 'Medium'
  return 'Large'
}

export function shortSize(size: Size): string {
  return size[0] ?? size
}

export function availabilityTone(count: number): string {
  if (count === 0) return 'bg-elevated text-ink-faint'
  if (count <= 2) return 'bg-warn-soft text-warn'
  return 'bg-ok-soft text-ok'
}

export function statusTone(status: string): string {
  if (status === 'Reserved') return 'bg-accent-soft text-accent-text'
  if (status === 'Active' || status === 'Open') return 'bg-ok-soft text-ok'
  if (status === 'Expired' || status === 'Cancelled') return 'bg-danger-soft text-danger'
  if (status === 'Maintenance') return 'bg-warn-soft text-warn'
  return 'bg-elevated text-ink-muted'
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
