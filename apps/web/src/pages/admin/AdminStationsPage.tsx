import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { createAdminStation, deleteAdminStation, listAdminStations } from '../../lib/api'
import { ADMIN_STATION_STATUS_OPTIONS } from '../../lib/adminFilterOptions'
import { useAdminList, useAdminMutation } from '../../lib/adminQuery'
import { statusLabel, statusTone } from '../../lib/format'
import type { AdminStationListItem } from '../../lib/types'
import { AdminDataTable, type AdminColumn } from '../../ui/AdminDataTable'
import { AdminFilterBar, AdminFilterChips } from '../../ui/AdminFilters'
import { useConfirm } from '../../ui/ConfirmDialog'
import {
  cardClass,
  Field,
  fieldClass,
  Page,
  primaryButtonClass,
  secondaryButtonClass,
  tableActionClass,
  tableDangerActionClass,
} from '../../ui/Page'
import { Badge } from '../../ui/states'

export function AdminStationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [creating, setCreating] = useState(searchParams.get('new') === '1')
  const { confirm, dialog } = useConfirm()

  const list = useAdminList({
    resource: 'stations',
    filters: ['status'],
    fetch: (token, query) => listAdminStations(token, query),
  })

  const toggleCreating = (next: boolean) => {
    setCreating(next)
    if (!next && searchParams.get('new')) {
      const params = new URLSearchParams(searchParams)
      params.delete('new')
      setSearchParams(params, { replace: true })
    }
  }

  const create = useAdminMutation({
    run: (token, body: { name: string; address: string; latitude: number; longitude: number }) =>
      createAdminStation(token, body),
    success: 'สร้างสถานีสำเร็จ',
    invalidate: [list.cacheKey],
  })

  const remove = useAdminMutation({
    run: (token, id: string) => deleteAdminStation(token, id),
    success: 'ลบสถานีสำเร็จ',
    invalidate: [list.cacheKey],
  })

  const askRemove = async (station: AdminStationListItem) => {
    const ok = await confirm({
      title: `ลบสถานี "${station.name}"?`,
      message: 'ลบได้เฉพาะสถานีที่ไม่มีการจอง — การลบย้อนกลับไม่ได้',
      confirmLabel: 'ลบสถานี',
      danger: true,
    })
    if (ok) remove.mutate(station.id)
  }

  const columns: AdminColumn<AdminStationListItem>[] = [
    {
      header: 'ชื่อสถานี',
      card: 'title',
      cell: (station) => (
        <Link
          to={`/admin/stations/${station.id}`}
          className="font-medium text-accent-text hover:underline"
        >
          {station.name}
        </Link>
      ),
    },
    {
      header: 'ที่อยู่',
      hide: 'md',
      className: 'max-w-xs truncate text-ink-muted',
      cell: (station) => station.address,
    },
    {
      header: 'สถานะ',
      card: 'badge',
      cell: (station) => <Badge tone={statusTone(station.status)}>{statusLabel(station.status)}</Badge>,
    },
    {
      header: 'ช่อง',
      align: 'right',
      className: 'tabular-nums',
      cell: (station) => station.compartment_count,
    },
    {
      header: 'จัดการ',
      align: 'right',
      card: 'actions',
      cell: (station) => (
        <div className="flex items-center justify-end gap-2">
          <Link to={`/admin/stations/${station.id}`} className={tableActionClass}>
            แก้ไข
          </Link>
          <button
            type="button"
            className={tableDangerActionClass}
            disabled={remove.isPending}
            onClick={() => void askRemove(station)}
          >
            ลบ
          </button>
        </div>
      ),
    },
  ]

  return (
    <Page
      title="สถานีตู้ล็อกเกอร์"
      wide
      action={
        <button
          type="button"
          className={creating ? secondaryButtonClass : primaryButtonClass}
          onClick={() => toggleCreating(!creating)}
        >
          {creating ? 'ยกเลิก' : '+ เพิ่มสถานี'}
        </button>
      }
    >
      {creating ? (
        <CreateStationForm
          pending={create.isPending}
          onSubmit={(body) =>
            create.mutate(body, {
              onSuccess: () => toggleCreating(false),
            })
          }
        />
      ) : null}

      <AdminFilterBar active={list.filtersActive} onClear={list.clearFilters}>
        <AdminFilterChips
          label="สถานะ"
          value={list.value('status')}
          options={ADMIN_STATION_STATUS_OPTIONS}
          onChange={(next) => list.setFilter('status', next)}
        />
      </AdminFilterBar>

      <AdminDataTable
        query={list.query}
        columns={columns}
        rowKey={(station) => station.id}
        errorMessage="โหลดรายการสถานีไม่สำเร็จ"
        emptyMessage="ยังไม่มีสถานีในระบบ"
        emptyHint="เพิ่มสถานีแรกเพื่อเริ่มทดสอบการจอง"
        emptyAction={{ label: '+ เพิ่มสถานี', onClick: () => toggleCreating(true) }}
        pagination={list.pagination}
      />

      {dialog}
    </Page>
  )
}

function CreateStationForm({
  pending,
  onSubmit,
}: {
  pending: boolean
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
      <div className="sm:col-span-2">
        <button type="submit" className={`${primaryButtonClass} w-auto min-w-32`} disabled={pending}>
          {pending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
      </div>
    </form>
  )
}
