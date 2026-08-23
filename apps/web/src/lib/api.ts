import { env } from './env'
import type {
  AdminReservation,
  AdminStation,
  AdminStationListItem,
  AdminSummary,
  LockerDetail,
  LockerListItem,
  LocationItem,
  Me,
  Payment,
  Reservation,
  Size,
} from './types'

export class ApiRequestError extends Error {
  status: number
  code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
  }
}

const MESSAGES: Record<string, string> = {
  NO_AVAILABILITY: 'ตู้ที่เลือกไม่ว่างในช่วงเวลานี้แล้ว กรุณาเลือกเวลาหรือขนาดอื่น',
  STATION_UNAVAILABLE: 'ตู้นี้ไม่เปิดให้จอง',
  INVALID_RESERVATION: 'เลือกเวลาเริ่มต้นในอนาคต ระยะ 1–24 ชม. และไม่เกิน 7 วัน',
  UNAUTHORIZED: 'กรุณาเข้าสู่ระบบอีกครั้ง',
  CANNOT_CANCEL: 'ยกเลิกได้เฉพาะรายการที่ยังจองอยู่และยังไม่ชำระ',
  CANNOT_PAY: 'ชำระได้เฉพาะรายการที่ยังจองอยู่',
  INVALID_PAYMENT_METHOD: 'เลือกวิธีชำระเงินก่อน',
  CANNOT_DEPOSIT: 'ฝากของได้หลังจากชำระเงินแล้ว',
  CANNOT_PICKUP: 'รับของได้เฉพาะตอนที่ของอยู่ในช่องแล้ว',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  IDEMPOTENCY_KEY_REQUIRED: 'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่',
  FORBIDDEN: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้',
  DUPLICATE_LABEL: 'มีช่องล็อกเกอร์ชื่อนี้ในสถานีนี้แล้ว',
}

function friendlyMessage(code?: string): string {
  if (code && MESSAGES[code]) {
    return MESSAGES[code]
  }
  return 'เกิดข้อผิดพลาด กรุณาลองใหม่'
}

async function request<T>(
  path: string,
  options: {
    token: string
    method?: string
    body?: unknown
    headers?: Record<string, string>
  },
): Promise<T> {
  const response = await fetch(`${env.apiBaseUrl}/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${options.token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const body = data as { code?: string } | null
    throw new ApiRequestError(
      response.status,
      body?.code ?? 'UNKNOWN',
      friendlyMessage(body?.code),
    )
  }
  return data as T
}

function toQueryString(query: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }
  return params.size ? `?${params}` : ''
}

export function listLocations(token: string) {
  return request<{ items: LocationItem[] }>('/lockers/locations', { token })
}

export function listLockers(
  token: string,
  query: Record<string, string | undefined>,
) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value) {
      params.set(key, value)
    }
  }
  const suffix = params.size ? `?${params}` : ''
  return request<{ items: LockerListItem[] }>(`/lockers${suffix}`, { token })
}

export function getLocker(token: string, id: string) {
  return request<LockerDetail>(`/lockers/${id}`, { token })
}

export function createReservation(
  token: string,
  body: {
    station_id: string
    size: string
    start_time: string
    duration_hours: number
  },
  idempotencyKey: string,
) {
  return request<Reservation>('/reservations', {
    token,
    method: 'POST',
    body,
    headers: { 'Idempotency-Key': idempotencyKey },
  })
}

export function listReservations(token: string) {
  return request<{ items: Reservation[] }>('/reservations', { token })
}

export function getReservation(token: string, id: string) {
  return request<Reservation>(`/reservations/${id}`, { token })
}

export function cancelReservation(token: string, id: string) {
  return request<Reservation>(`/reservations/${id}/cancel`, {
    token,
    method: 'PATCH',
  })
}

export function payReservation(token: string, id: string, method: 'promptpay' | 'card' | 'bank') {
  return request<Reservation>(`/reservations/${id}/pay`, {
    token,
    method: 'PATCH',
    body: { method },
  })
}

export function depositReservation(token: string, id: string) {
  return request<Reservation>(`/reservations/${id}/deposit`, {
    token,
    method: 'PATCH',
  })
}

export function pickupReservation(token: string, id: string) {
  return request<Reservation>(`/reservations/${id}/pickup`, {
    token,
    method: 'PATCH',
  })
}

export function getMe(token: string) {
  return request<Me>('/me', { token })
}

export function listAdminStations(
  token: string,
  query: Record<string, string | undefined>,
) {
  return request<{ items: AdminStationListItem[]; page: number; limit: number; total: number }>(
    `/admin/stations${toQueryString(query)}`,
    { token },
  )
}

export function getAdminStation(token: string, id: string) {
  return request<AdminStation>(`/admin/stations/${id}`, { token })
}

export function createAdminStation(
  token: string,
  body: { name: string; address: string; latitude: number; longitude: number; status?: string },
) {
  return request<AdminStation>('/admin/stations', { token, method: 'POST', body })
}

export function updateAdminStation(
  token: string,
  id: string,
  body: Partial<{
    name: string
    address: string
    latitude: number
    longitude: number
    status: string
  }>,
) {
  return request<AdminStation>(`/admin/stations/${id}`, { token, method: 'PATCH', body })
}

export function createAdminCompartment(
  token: string,
  stationId: string,
  body: { size: Size; label: string },
) {
  return request<AdminStation>(`/admin/stations/${stationId}/compartments`, {
    token,
    method: 'POST',
    body,
  })
}

export function upsertAdminStationPricing(
  token: string,
  stationId: string,
  size: Size,
  ratePerHour: number,
) {
  return request<AdminStation>(`/admin/stations/${stationId}/pricing/${size}`, {
    token,
    method: 'PUT',
    body: { rate_per_hour: ratePerHour },
  })
}

export function listAdminReservations(
  token: string,
  query: Record<string, string | undefined>,
) {
  return request<{ items: AdminReservation[]; page: number; limit: number }>(
    `/admin/reservations${toQueryString(query)}`,
    { token },
  )
}

export function listAdminPayments(token: string, query: Record<string, string | undefined>) {
  return request<{ items: Payment[]; page: number; limit: number }>(
    `/admin/payments${toQueryString(query)}`,
    { token },
  )
}

export function getAdminSummary(token: string) {
  return request<AdminSummary>('/admin/summary', { token })
}
