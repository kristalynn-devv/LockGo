export type Size = 'Small' | 'Medium' | 'Large'

export const SIZES: Size[] = ['Small', 'Medium', 'Large']

export type LocationItem = {
  id: string
  name: string
  latitude: number
  longitude: number
}

export type LockerListItem = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  status: string
  distance_km: number | null
  available: Record<Size, number>
  starting_price: number
  rates: Record<Size, number>
  availability_mode: 'now' | 'window'
}

export type LockerDetail = {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  status: string
  available: Record<Size, number>
  rates: Record<Size, number>
  starting_price: number
  available_time: Record<Size, { start: string; end: string }[]>
  operating_hours: string
}

export type Reservation = {
  id: string
  reservation_number: string
  station_id: string
  station_name: string
  address: string
  size: Size
  compartment_label: string
  start_time: string
  end_time: string
  no_show_deadline: string
  status: string
  unit_price: number
  duration_hours: number
  total_price: number
}

export type LockerFilters = {
  location: string
  distance: string
  size: string
  price: string
  availableOnly: boolean
}
