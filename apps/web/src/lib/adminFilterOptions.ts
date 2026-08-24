export const ADMIN_PAGE_SIZE = 20

export const ADMIN_STATION_STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'Open', label: 'เปิด' },
  { value: 'Maintenance', label: 'ซ่อมบำรุง' },
  { value: 'Closed', label: 'ปิด' },
] as const

export const ADMIN_RESERVATION_STATUS_OPTIONS = [
  { value: '', label: 'ทุกสถานะ' },
  { value: 'Reserved', label: 'จองอยู่' },
  { value: 'Active', label: 'ใช้งานอยู่' },
  { value: 'Completed', label: 'เสร็จแล้ว' },
  { value: 'Cancelled', label: 'ยกเลิกแล้ว' },
  { value: 'Expired', label: 'หมดอายุ' },
] as const

export const ADMIN_PAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'ทุกวิธี' },
  { value: 'promptpay', label: 'พร้อมเพย์' },
  { value: 'card', label: 'บัตร' },
  { value: 'bank', label: 'โอนธนาคาร' },
] as const

export type AdminFilterOption = { value: string; label: string }
