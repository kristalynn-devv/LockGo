import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiRequestError, createAdminStation, listAdminStations } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { statusLabel, statusTone } from '../../lib/format'
import {
  cardClass,
  cardCtaClass,
  cardGridClass,
  cardHitClass,
  cardTitleClass,
  Field,
  fieldClass,
  filterRowClass,
  labelClass,
  Page,
  primaryButtonClass,
  secondaryButtonClass,
} from '../../ui/Page'
import { Icon } from '../../ui/icons'
import { Chip, EmptyState, ErrorState, FormError, SkeletonList } from '../../ui/states'

const STATUS_FILTERS = [
  { id: 'Open', label: 'เปิด' },
  { id: 'Maintenance', label: 'ซ่อมบำรุง' },
  { id: 'Closed', label: 'ปิด' },
] as const

export function AdminStationsPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const [creating, setCreating] = useState(false)

  const setStatus = (next: string) => {
    setSearchParams(next ? { status: next } : {}, { replace: true })
  }

  const stations = useQuery({
    queryKey: ['admin', 'stations', status, token],
    queryFn: () => listAdminStations(token, { status: status || undefined }),
    enabled: Boolean(token),
  })

  const create = useMutation({
    mutationFn: (body: { name: string; address: string; latitude: number; longitude: number }) =>
      createAdminStation(token, body),
    onSuccess: () => {
      setCreating(false)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'stations'] })
    },
  })

  return (
    <Page
      title="สถานีตู้ล็อกเกอร์"
      wide
      action={
        <button type="button" className={secondaryButtonClass} onClick={() => setCreating((v) => !v)}>
          {creating ? 'ยกเลิก' : '+ เพิ่มสถานี'}
        </button>
      }
    >
      {creating ? (
        <CreateStationForm
          pending={create.isPending}
          error={create.isError ? create.error : null}
          onSubmit={(body) => create.mutate(body)}
        />
      ) : null}

      <div className={`${filterRowClass} mb-4`}>
        {STATUS_FILTERS.map((item) => (
          <Chip
            key={item.id}
            compact
            pressed={status === item.id}
            onClick={() => setStatus(status === item.id ? '' : item.id)}
          >
            {item.label}
          </Chip>
        ))}
      </div>

      {stations.isLoading ? <SkeletonList count={4} /> : null}

      {stations.isError ? (
        <ErrorState
          message="โหลดรายการสถานีไม่สำเร็จ"
          onRetry={() => void stations.refetch()}
        />
      ) : null}

      {stations.isSuccess && stations.data.items.length === 0 ? (
        <EmptyState message="ยังไม่มีสถานีในระบบ" />
      ) : null}

      {stations.isSuccess && stations.data.items.length > 0 ? (
        <div className={cardGridClass}>
          {stations.data.items.map((station) => (
            <Link
              key={station.id}
              to={`/admin/stations/${station.id}`}
              className={`${cardClass} ${cardHitClass}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className={`min-w-0 ${cardTitleClass}`}>{station.name}</h2>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusTone(station.status)}`}
                >
                  {statusLabel(station.status)}
                </span>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
                <Icon name="pin" className="size-4" />
                <span className="truncate">{station.address}</span>
              </p>
              <div className="mt-3 flex items-end justify-between gap-3 border-t border-line pt-3">
                <div>
                  <p className={labelClass}>ช่องล็อกเกอร์</p>
                  <p className="text-lg font-semibold">{station.compartment_count}</p>
                </div>
                <span className={cardCtaClass}>
                  จัดการ
                  <Icon name="arrow" className="size-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </Page>
  )
}

function CreateStationForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean
  error: unknown
  onSubmit: (body: { name: string; address: string; latitude: number; longitude: number }) => void
}) {
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')

  return (
    <form
      className={`${cardClass} mb-4 grid gap-3 p-4 sm:grid-cols-2`}
      onSubmit={(event) => {
        event.preventDefault()
        const lat = Number(latitude)
        const lng = Number(longitude)
        if (!name.trim() || !address.trim() || Number.isNaN(lat) || Number.isNaN(lng)) return
        onSubmit({ name: name.trim(), address: address.trim(), latitude: lat, longitude: lng })
      }}
    >
      <Field label="ชื่อสถานี">
        <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>
      <Field label="ที่อยู่">
        <input
          className={fieldClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
        />
      </Field>
      <Field label="ละติจูด">
        <input
          className={fieldClass}
          type="number"
          step="0.000001"
          value={latitude}
          onChange={(e) => setLatitude(e.target.value)}
          required
        />
      </Field>
      <Field label="ลองจิจูด">
        <input
          className={fieldClass}
          type="number"
          step="0.000001"
          value={longitude}
          onChange={(e) => setLongitude(e.target.value)}
          required
        />
      </Field>
      {error ? (
        <div className="sm:col-span-2">
          <FormError
            message={error instanceof ApiRequestError ? error.message : 'สร้างสถานีไม่สำเร็จ กรุณาลองใหม่'}
          />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <button type="submit" className={`${primaryButtonClass} w-auto min-w-32`} disabled={pending}>
          {pending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>
    </form>
  )
}
