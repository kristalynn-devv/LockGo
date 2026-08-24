import type { QueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  createAdminCompartment,
  deleteAdminCompartment,
  getAdminStation,
  updateAdminStation,
  upsertAdminStationPricing,
} from '../../lib/api'
import { useAdminMutation, useAdminQuery, useAdminQueryKey } from '../../lib/adminQuery'
import { statusLabel, statusTone } from '../../lib/format'
import type { AdminStation, Size } from '../../lib/types'
import { SIZES } from '../../lib/types'
import { AdminTable, AdminTableBody, AdminTableHead, AdminTd, AdminTh } from '../../ui/AdminTable'
import { useConfirm } from '../../ui/ConfirmDialog'
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
  tableActionClass,
  tableDangerActionClass,
} from '../../ui/Page'
import { Badge, ErrorState, SkeletonList } from '../../ui/states'

const STATUS_OPTIONS = [
  { value: 'Open', label: 'เปิด' },
  { value: 'Maintenance', label: 'ซ่อมบำรุง' },
  { value: 'Closed', label: 'ปิด' },
]

export function AdminStationDetailPage() {
  const { id = '' } = useParams()
  const { confirm, dialog } = useConfirm()

  // คีย์ของหน้ารายละเอียดใช้ 'station' (เอกพจน์) แยกจากคีย์รายการ 'stations'
  // เพื่อให้ invalidate รายการไม่ลากให้หน้านี้โหลดซ้ำโดยไม่จำเป็น
  const detailKey = useAdminQueryKey(['admin', 'station', id])
  const station = useAdminQuery(['admin', 'station', id], (token) => getAdminStation(token, id), {
    enabled: Boolean(id),
  })

  const listKey = ['admin', 'stations']

  /** ทุก endpoint ของสถานีตอบข้อมูลสถานีชุดเต็มกลับมา เขียนลงแคชเลยจะเห็นผลทันที */
  const applyStation = (queryClient: QueryClient, data: AdminStation) => {
    queryClient.setQueryData(detailKey, data)
  }

  const update = useAdminMutation({
    run: (token, body: Parameters<typeof updateAdminStation>[2]) =>
      updateAdminStation(token, id, body),
    success: 'บันทึกข้อมูลสถานีสำเร็จ',
    invalidate: [listKey],
    applyToCache: applyStation,
  })

  const addCompartment = useAdminMutation({
    run: (token, body: { size: Size; label: string }) => createAdminCompartment(token, id, body),
    success: 'เพิ่มช่องล็อกเกอร์สำเร็จ',
    invalidate: [listKey],
    applyToCache: applyStation,
  })

  const removeCompartment = useAdminMutation({
    run: (token, compartmentId: string) => deleteAdminCompartment(token, id, compartmentId),
    success: 'ลบช่องล็อกเกอร์สำเร็จ',
    invalidate: [listKey],
    applyToCache: applyStation,
  })

  const upsertPricing = useAdminMutation({
    run: (token, args: { size: Size; rate: number }) =>
      upsertAdminStationPricing(token, id, args.size, args.rate),
    success: (_data, args) => `บันทึกราคา ${args.size} สำเร็จ`,
    applyToCache: applyStation,
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

  const askRemoveCompartment = async (compartment: { id: string; label: string }) => {
    const ok = await confirm({
      title: `ลบช่อง ${compartment.label}?`,
      message: 'การลบย้อนกลับไม่ได้',
      confirmLabel: 'ลบช่อง',
      danger: true,
    })
    if (ok) removeCompartment.mutate(compartment.id)
  }

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
            station={data}
            pending={update.isPending}
            onSubmit={(body) => update.mutate(body)}
          />
        }
        aside={
          <div className="grid gap-3">
            <div className={`${cardClass} p-4`}>
              <div className="mb-3 flex items-center justify-between">
                <p className={labelClass}>ช่องล็อกเกอร์ ({data.compartments.length})</p>
                <Badge tone={statusTone(data.status)}>{statusLabel(data.status)}</Badge>
              </div>

              <AdminTable>
                <AdminTableHead>
                  <tr>
                    <AdminTh>ป้ายช่อง</AdminTh>
                    <AdminTh>ขนาด</AdminTh>
                    <AdminTh className="text-right">ลบ</AdminTh>
                  </tr>
                </AdminTableHead>
                <AdminTableBody>
                  {data.compartments.length === 0 ? (
                    <tr>
                      <AdminTd colSpan={3} className="text-center text-ink-muted">
                        ยังไม่มีช่องล็อกเกอร์
                      </AdminTd>
                    </tr>
                  ) : (
                    data.compartments.map((compartment) => (
                      <tr key={compartment.id}>
                        <AdminTd className="font-medium">{compartment.label}</AdminTd>
                        <AdminTd className="text-ink-muted">{compartment.size}</AdminTd>
                        <AdminTd className="text-right">
                          <button
                            type="button"
                            className={tableDangerActionClass}
                            disabled={removeCompartment.isPending}
                            onClick={() => void askRemoveCompartment(compartment)}
                          >
                            ลบ
                          </button>
                        </AdminTd>
                      </tr>
                    ))
                  )}
                </AdminTableBody>
              </AdminTable>

              <AddCompartmentForm
                pending={addCompartment.isPending}
                onSubmit={(body, done) => addCompartment.mutate(body, { onSuccess: done })}
              />
            </div>

            <div className={`${cardClass} p-4`}>
              <p className={`${labelClass} mb-3`}>ราคาต่อชั่วโมง</p>
              <AdminTable>
                <AdminTableHead>
                  <tr>
                    <AdminTh>ขนาด</AdminTh>
                    <AdminTh>เรท (฿/ชม.)</AdminTh>
                    <AdminTh className="text-right">บันทึก</AdminTh>
                  </tr>
                </AdminTableHead>
                <AdminTableBody>
                  {SIZES.map((size) => (
                    <PricingRow
                      key={size}
                      size={size}
                      rate={data.pricing[size]}
                      pending={upsertPricing.isPending && upsertPricing.variables?.size === size}
                      onSave={(rate) => upsertPricing.mutate({ size, rate })}
                    />
                  ))}
                </AdminTableBody>
              </AdminTable>
            </div>
          </div>
        }
      />

      {dialog}
    </Page>
  )
}

type StationFormValues = {
  name: string
  address: string
  latitude: number
  longitude: number
  status: string
}

function StationForm({
  station,
  pending,
  onSubmit,
}: {
  station: StationFormValues
  pending: boolean
  onSubmit: (body: StationFormValues) => void
}) {
  const [form, setForm] = useState({
    name: station.name,
    address: station.address,
    latitude: String(station.latitude),
    longitude: String(station.longitude),
    status: station.status,
  })

  const dirty =
    form.name !== station.name ||
    form.address !== station.address ||
    form.latitude !== String(station.latitude) ||
    form.longitude !== String(station.longitude) ||
    form.status !== station.status

  return (
    <form
      className={`${cardClass} grid gap-3 p-4`}
      onSubmit={(event) => {
        event.preventDefault()
        const lat = Number(form.latitude)
        const lng = Number(form.longitude)
        if (Number.isNaN(lat) || Number.isNaN(lng)) return
        onSubmit({
          name: form.name,
          address: form.address,
          latitude: lat,
          longitude: lng,
          status: form.status,
        })
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
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className={`${primaryButtonClass} w-auto min-w-32`}
          disabled={pending || !dirty}
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกการแก้ไข'}
        </button>
        {dirty && !pending ? (
          <span className="text-xs text-ink-muted">มีการแก้ไขที่ยังไม่บันทึก</span>
        ) : null}
      </div>
    </form>
  )
}

function AddCompartmentForm({
  pending,
  onSubmit,
}: {
  pending: boolean
  /** done() เรียกเมื่อบันทึกสำเร็จเท่านั้น - เดิมล้างช่องกรอกทิ้งก่อนรู้ผล พอชื่อซ้ำก็พิมพ์ใหม่หมด */
  onSubmit: (body: { size: Size; label: string }, done: () => void) => void
}) {
  const [size, setSize] = useState<Size>('Small')
  const [label, setLabel] = useState('')

  return (
    <form
      className="mt-3 flex flex-wrap items-end gap-2 border-t border-line pt-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (!label.trim()) return
        onSubmit({ size, label: label.trim() }, () => setLabel(''))
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
        className={`${fieldClass} h-9 min-h-0 min-w-[120px] flex-1`}
        placeholder="ป้ายช่อง เช่น S-05"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <button
        type="submit"
        className={`${primaryButtonClass} h-9 min-h-0 w-auto px-3`}
        disabled={pending}
      >
        เพิ่มช่อง
      </button>
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

  const changed = value !== (rate != null ? String(rate) : '')

  return (
    <tr>
      <AdminTd className="text-ink-muted">{size}</AdminTd>
      <AdminTd>
        <input
          className={`${fieldClass} h-9 min-h-0`}
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </AdminTd>
      <AdminTd className="text-right">
        <button
          type="button"
          className={tableActionClass}
          disabled={pending || !changed}
          onClick={() => {
            const next = Number(value)
            if (!Number.isNaN(next)) onSave(next)
          }}
        >
          {pending ? '…' : 'บันทึก'}
        </button>
      </AdminTd>
    </tr>
  )
}
