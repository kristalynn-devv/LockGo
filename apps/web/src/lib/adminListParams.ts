import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export function useAdminListParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const get = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams])

  const page = Number(searchParams.get('page') ?? '1')

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      if (value) params.set(key, value)
      else params.delete(key)
      params.delete('page')
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const setPage = useCallback(
    (next: number) => {
      const params = new URLSearchParams(searchParams)
      if (next <= 1) params.delete('page')
      else params.set('page', String(next))
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const clearParams = useCallback(
    (keys: string[]) => {
      const params = new URLSearchParams(searchParams)
      for (const key of keys) params.delete(key)
      params.delete('page')
      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const hasActive = useCallback(
    (keys: string[]) => keys.some((key) => Boolean(searchParams.get(key))),
    [searchParams],
  )

  return { get, page, setParam, setPage, clearParams, hasActive }
}
