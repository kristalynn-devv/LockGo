import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import { ADMIN_PAGE_SIZE } from './adminFilterOptions'
import { useAdminFlash } from './adminFlash'
import { useAdminListParams } from './adminListParams'
import { useAuth } from './auth'

/* --------------------------------------------------------------------------
   ชั้นกลางของหน้าแอดมิน - ทุกหน้าเคยเขียน token/enabled/invalidate/toast ซ้ำกันเอง

   หมายเหตุสำคัญเรื่องคีย์แคช: ห้ามใส่ access token ลงในคีย์
   Supabase ออก token ใหม่เป็นระยะ ถ้าคีย์ผูกกับ token ทุก query จะกลายเป็นคีย์ใหม่
   แล้วโหลดใหม่ทั้งหน้าพร้อมโครงกระดูก — ต้นเหตุที่หน้าแอดมิน "หน่วง" เป็นช่วง ๆ
   จึงผูกคีย์กับ user id แทน แล้วอ่าน token สด ๆ จาก ref ตอนยิงจริง
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

function useTokenRef() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const ref = useRef(token)
  ref.current = token
  return { ref, ready: Boolean(token), userId: session?.user.id ?? '' }
}

/** คีย์เต็มของ query แอดมิน (ต่อ user id ท้ายคีย์) — ใช้ตอนต้องเขียนแคชตรง ๆ */
export function useAdminQueryKey(key: QueryKey): QueryKey {
  const { userId } = useTokenRef()
  return [...key, userId]
}

/** query ที่ต้องมี token — ไม่ยิงจนกว่าจะล็อกอินเสร็จ */
export function useAdminQuery<T>(
  key: QueryKey,
  fetcher: (token: string) => Promise<T>,
  options?: {
    enabled?: boolean
    staleTime?: number
    refetchOnMount?: boolean | 'always'
  },
) {
  const { ref, ready, userId } = useTokenRef()
  return useQuery({
    queryKey: [...key, userId],
    queryFn: () => fetcher(ref.current),
    enabled: ready && (options?.enabled ?? true),
    staleTime: options?.staleTime,
    refetchOnMount: options?.refetchOnMount,
    refetchOnWindowFocus: false,
  })
}

/** mutation + toast + ล้าง/เขียนแคชที่เกี่ยวข้อง ในที่เดียว */
export function useAdminMutation<TArgs, TData>({
  run,
  success: successMessage,
  invalidate = [],
  applyToCache,
}: {
  run: (token: string, args: TArgs) => Promise<TData>
  success: string | ((data: TData, args: TArgs) => string)
  invalidate?: QueryKey[]
  /** เขียนผลลัพธ์ที่ API ตอบกลับลงแคชทันที ไม่ต้องรอ refetch รอบใหม่ */
  applyToCache?: (queryClient: QueryClient, data: TData, args: TArgs) => void
}) {
  const { ref } = useTokenRef()
  const queryClient = useQueryClient()
  const { success, fail, clear } = useAdminFlash()

  return useMutation({
    mutationFn: (args: TArgs) => {
      clear()
      return run(ref.current, args)
    },
    onSuccess: (data, args) => {
      applyToCache?.(queryClient, data, args)
      success(typeof successMessage === 'function' ? successMessage(data, args) : successMessage)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'summary'] })
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
  const { ref, ready, userId } = useTokenRef()
  const { get, page, setParam, setPage, clearParams, hasActive } = useAdminListParams()

  const values: Record<string, string> = {}
  for (const name of filters) {
    values[name] = get(name)
  }

  const query = useQuery({
    queryKey: ['admin', resource, values, page, userId],
    queryFn: () => {
      const params: Record<string, string | undefined> = {
        page: String(page),
        limit: String(ADMIN_PAGE_SIZE),
      }
      for (const name of filters) {
        params[name] = values[name] || undefined
      }
      return fetch(ref.current, params)
    },
    enabled: ready,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
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
