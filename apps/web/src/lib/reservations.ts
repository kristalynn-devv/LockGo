import { useQuery } from '@tanstack/react-query'
import { listReservations } from './api'
import { isAwaitingPayment, isLockerReady, type Reservation } from './types'

export function useReservationList(token: string) {
  return useQuery({
    queryKey: ['reservations', 'list'],
    queryFn: () => listReservations(token),
    enabled: Boolean(token),
  })
}

export function awaitingPayment(items: Reservation[] | undefined) {
  return (items ?? []).filter(isAwaitingPayment)
}

export function inUse(items: Reservation[] | undefined) {
  return (items ?? []).filter(isLockerReady)
}
