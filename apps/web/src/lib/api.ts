import { env } from './env'
import type { LockerDetail, LockerListItem, LocationItem, Reservation } from './types'

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
  CANNOT_CANCEL: 'ยกเลิกได้เฉพาะรายการที่ยังจองอยู่',
  NOT_FOUND: 'ไม่พบข้อมูลที่ต้องการ',
  IDEMPOTENCY_KEY_REQUIRED: 'ไม่สามารถส่งคำขอได้ กรุณาลองใหม่',
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
