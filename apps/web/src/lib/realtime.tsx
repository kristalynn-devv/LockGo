import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from './auth'
import { supabase } from './supabase'

export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  useEffect(() => {
    if (!session) {
      return
    }

    const channel = supabase
      .channel('lockgo-reservations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['lockers'] })
          void queryClient.invalidateQueries({ queryKey: ['reservations'] })
          void queryClient.invalidateQueries({ queryKey: ['admin'] })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient, session])

  return null
}
