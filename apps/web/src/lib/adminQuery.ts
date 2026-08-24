import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { useCallback } from 'react'
import { ADMIN_PAGE_SIZE } from './adminFilterOptions'
import { useAdminFlash } from './adminFlash'
import { useAdminListParams } from './adminListParams'
import { useAuth } from './auth'

/* --------------------------------------------------------------------------
   ชั้นกลางของหน้าแอดมิน - ทุกหน้าเคยเขียน token/enabled/invalidate/toast ซ้ำกันเอง
   -------------------------------------------------------------------------- */

export type AdminListResult<T> = {
  items: T[]
  page: number
  limit: number
  total?: number
}

export function useAdminToken(): string {
  const { session } = useAuth()
  return session?.access_token ?? ''
}

/** query ที่ต้องมี token — ไม่ยิงจนกว่าจะล็อกอินเสร็จ */
export function useAdminQuery<T>(
  key: QueryKey,
  fetcher: (token: string) => Promise<T>,
  options?: { enabled?: boolean },
) {
  const token = useAdminToken()
  return useQuery({
    queryKey: [...key, token],
    queryFn: () => fetcher(token),
    enabled: Boolean(token) && (options?.enabled ?? true),
  })
}

/** mutation + toast + ล้าง cache ที่เกี่ยวข้อง ในที่เดียว */
export function useAdminMutation<TArgs, TData>({
  run,
  success: successMessage,
  invalidate = [],
}: {
  run: (token: string, args: TArgs) => Promise<TData>
  success: string | ((data: TData, args: TArgs) => string)
  invalidate?: QueryKey[]
}) {
  const token = useAdminToken()
  const queryClient = useQueryClient()
  const { success, fail, clear } = useAdminFlash()

  return useMutation({
    mutationFn: (args: TArgs) => {
      clear()
      return run(token, args)
    },
    onSuccess: (data, args) => {
      success(typeof successMessage === 'function' ? successMessage(data, args) : successMessage)
      for (const key of invalidate) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    },
    onError: fail,
  })
}

export type AdminPagination = {
  page: number
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
}

/** ตัวกรอง (อยู่ใน URL) + เพจ + query ของรายการ — คืนทุกอย่างที่ตารางต้องใช้ */
export function useAdminList<T>({
  resource,
  filters,
  fetch,
}: {
  resource: string
  filters: readonly string[]
  fetch: (
    token: string,
    query: Record<string, string | undefined>,
  ) => Promise<AdminListResult<T>>
}) {
  const token = useAdminToken()
  const { get, page, setParam, setPage, clearParams, hasActive } = useAdminListParams()

  const values: Record<string, string> = {}
  for (const name of filters) {
    values[name] = get(name)
  }

  const query = useQuery({
    queryKey: ['admin', resource, values, page, token],
    queryFn: () => {
      const params: Record<string, string | undefined> = {
        page: String(page),
        limit: String(ADMIN_PAGE_SIZE),
      }
      for (const name of filters) {
        params[name] = values[name] || undefined
      }
      return fetch(token, params)
    },
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  })

  const total = query.data?.total
  const loaded = query.data?.items.length ?? 0
  const hasNext = total != null ? page * ADMIN_PAGE_SIZE < total : loaded >= ADMIN_PAGE_SIZE

  const clearFilters = useCallback(() => clearParams([...filters]), [clearParams, filters])

  return {
    query,
    items: query.data?.items ?? [],
    total,
    value: (name: string) => values[name] ?? '',
    setFilter: setParam,
    clearFilters,
    filtersActive: hasActive([...filters]),
    /** key ของ cache ก้อนนี้ ใช้ส่งให้ useAdminMutation ตอน invalidate */
    cacheKey: ['admin', resource] as QueryKey,
    pagination: {
      page,
      hasPrevious: page > 1,
      hasNext,
      onPrevious: () => setPage(page - 1),
      onNext: () => setPage(page + 1),
    } satisfies AdminPagination,
  }
}
