import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ApiRequestError,
  createAdminCompartment,
  getAdminStation,
  updateAdminStation,
  upsertAdminStationPricing,
} from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { statusLabel, statusTone } from '../../lib/format'
import type { Size } from '../../lib/types'
import { SIZES } from '../../lib/types'
import { Icon } from '../../ui/icons'
import { MenuSelect } from '../../ui/MenuSelect'
import {
  cardClass,
  Field,
  fieldClass,
  labelClass,
  linkButtonClass,
  Page,
  primaryButtonClass,
  SplitLayout,
} from '../../ui/Page'
import { Badge, ErrorState, FormError, SkeletonList } from '../../ui/states'

const STATUS_OPTIONS = [
  { value: 'Open', label: 'เปิด' },
  { value: 'Maintenance', label: 'ซ่อมบำรุง' },
  { value: 'Closed', label: 'ปิด' },
]

export function AdminStationDetailPage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const token = session?.access_token ?? ''
  const queryClient = useQueryClient()

  const station = useQuery({
    queryKey: ['admin', 'stations', id],
    queryFn: () => getAdminStation(token, id),
    enabled: Boolean(token && id),
  })

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin', 'stations', id] })

  const update = useMutation({
    mutationFn: (body: Parameters<typeof updateAdminStation>[2]) =>
      updateAdminStation(token, id, body),
    onSuccess: invalidate,
  })

  const addCompartment = useMutation({
    mutationFn: (body: { size: Size; label: string }) => createAdminCompartment(token, id, body),
    onSuccess: invalidate,
  })

  const upsertPricing = useMutation({
    mutationFn: ({ size, rate }: { size: Size; rate: number }) =>
      upsertAdminStationPricing(token, id, size, rate),
    onSuccess: invalidate,
  })

  if (station.isLoading) {
    return (
      <Page title="สถานี" wide>
        <SkeletonList count={2} />
      </Page>
    )
  }

  if (station.isError || !station.data) {
    return (
      <Page title="สถานี" wide>
        <ErrorState message="โหลดข้อมูลสถานีไม่สำเร็จ" onRetry={() => void station.refetch()} />
      </Page>
    )
  }

  const data = station.data

  return (
    <Page
      title={data.name}
      wide
      action={
        <Link to="/admin/stations" className={linkButtonClass}>
          <Icon name="back" className="size-4" />
          กลับ
        </Link>
      }
    >
      <SplitLayout
        main={
          <StationForm
            key={data.id}
            name={data.name}
            address={data.address}
            latitude={data.latitude}
            longitude={data.longitude}
            status={data.status}
            pending={update.isPending}
            error={update.isError ? update.error : null}
            onSubmit={(body) => update.mutate(body)}
          />
        }
        aside={
          <div className="grid gap-3">
            <div className={`${cardClass} p-4`}>
              <div className="mb-2 flex items-center justify-between">
                <p className={labelClass}>ช่องล็อกเกอร์</p>
                <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
              </div>
              <ul className="grid gap-1.5">
                {data.compartments.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <span>{c.label}</span>
                    <span className="text-ink-muted">{c.size}</span>
                  </li>
                ))}
                {data.compartments.length === 0 ? (
                  <li className="text-sm text-ink-muted">ยังไม่มีช่องล็อกเกอร์</li>
                ) : null}
              </ul>
              <AddCompartmentForm
                pending={addCompartment.isPending}
                error={addCompartment.isError ? addCompartment.error : null}
                onSubmit={(body) => addCompartment.mutate(body)}
              />
            </div>

            <div className={`${cardClass} p-4`}>
              <p className={`${labelClass} mb-2`}>ราคาต่อชั่วโมง</p>
              <div className="grid gap-2">
                {SIZES.map((size) => (
                  <PricingRow
                    key={size}
                    size={size}
                    rate={data.pricing[size]}
                    pending={upsertPricing.isPending && upsertPricing.variables?.size === size}
                    onSave={(rate) => upsertPricing.mutate({ size, rate })}
                  />
                ))}
              </div>
            </div>
          </div>
        }
      />
    </Page>
  )
}

function StationForm({
  name,
  address,
  latitude,
  longitude,
  status,
  pending,
  error,
  onSubmit,
}: {
  name: string
  address: string
  latitude: number
  longitude: number
  status: string
  pending: boolean
  error: unknown
  onSubmit: (body: {
    name: string
    address: string
    latitude: number
    longitude: number
    status: string
  }) => void
}) {
  const [form, setForm] = useState({
    name,
    address,
    latitude: String(latitude),
    longitude: String(longitude),
    status,
  })

  return (
    <form
      className={`${cardClass} grid gap-3 p-4`}
      onSubmit={(event) => {
        event.preventDefault()
        const lat = Number(form.latitude)
        const lng = Number(form.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) return
        onSubmit({ name: form.name, address: form.address, latitude: lat, longitude: lng, status: form.status })
      }}
    >
      <Field label="ชื่อสถานี">
        <input
          className={fieldClass}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </Field>
      <Field label="ที่อยู่">
        <input
          className={fieldClass}
          value={form.address}
          onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ละติจูด">
          <input
            className={fieldClass}
            type="number"
            step="0.000001"
            value={form.latitude}
            onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
          />
        </Field>
        <Field label="ลองจิจูด">
          <input
            className={fieldClass}
            type="number"
            step="0.000001"
            value={form.longitude}
            onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
          />
        </Field>
      </div>
      <Field label="สถานะ">
        <MenuSelect
          variant="field"
          value={form.status}
          options={STATUS_OPTIONS}
          onChange={(value) => setForm((f) => ({ ...f, status: value }))}
        />
      </Field>
      {error ? (
        <FormError
          message={error instanceof ApiRequestError ? error.message : 'บันทึกไม่สำเร็จ กรุณาลองใหม่'}
        />
      ) : null}
      <button type="submit" className={`${primaryButtonClass} w-auto min-w-32`} disabled={pending}>
        {pending ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
      </button>
    </form>
  )
}

function AddCompartmentForm({
  pending,
  error,
  onSubmit,
}: {
  pending: boolean
  error: unknown
  onSubmit: (body: { size: Size; label: string }) => void
}) {
  const [size, setSize] = useState<Size>('Small')
  const [label, setLabel] = useState('')

  return (
    <form
      className="mt-3 flex items-end gap-2 border-t border-line pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!label.trim()) return
        onSubmit({ size, label: label.trim() })
        setLabel('')
      }}
    >
      <MenuSelect
        variant="pill"
        label="ขนาด"
        value={size}
        options={SIZES.map((s) => ({ value: s, label: s }))}
        onChange={(value) => setSize(value as Size)}
      />
      <input
        className={`${fieldClass} h-8 min-h-0 flex-1`}
        placeholder="ป้ายช่อง เช่น S-05"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <button type="submit" className={`${primaryButtonClass} h-8 min-h-0 w-auto px-3`} disabled={pending}>
        เพิ่ม
      </button>
      {error ? (
        <div className="basis-full">
          <FormError
            message={error instanceof ApiRequestError ? error.message : 'เพิ่มช่องไม่สำเร็จ'}
          />
        </div>
      ) : null}
    </form>
  )
}

function PricingRow({
  size,
  rate,
  pending,
  onSave,
}: {
  size: Size
  rate: number | undefined
  pending: boolean
  onSave: (rate: number) => void
}) {
  const [value, setValue] = useState(rate != null ? String(rate) : '')

  useEffect(() => {
    setValue(rate != null ? String(rate) : '')
  }, [rate])

  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-sm text-ink-muted">{size}</span>
      <input
        className={`${fieldClass} h-8 min-h-0 flex-1`}
        type="number"
        step="0.01"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        type="button"
        className={`${primaryButtonClass} h-8 min-h-0 w-auto px-3`}
        disabled={pending}
        onClick={() => {
          const n = Number(value)
          if (!Number.isNaN(n)) onSave(n)
        }}
      >
        บันทึก
      </button>
    </div>
  )
}
