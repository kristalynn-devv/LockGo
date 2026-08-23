import { useQuery } from '@tanstack/react-query'
import { getMe } from './api'
import { useAuth } from './auth'

export function useIsAdmin() {
  const { session } = useAuth()
  const token = session?.access_token

  const query = useQuery({
    queryKey: ['me'],
    queryFn: () => getMe(token!),
    enabled: Boolean(token),
    staleTime: 5 * 60_000,
  })

  return { isAdmin: query.data?.role === 'admin', loading: query.isLoading }
}
