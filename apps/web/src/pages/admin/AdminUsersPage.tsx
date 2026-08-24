import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  createAdminCustomer,
  deleteAdminCustomer,
  listAdminCustomers,
  updateAdminCustomer,
} from '../../lib/api'
import { useAdminList, useAdminMutation } from '../../lib/adminQuery'
import { formatDateTime } from '../../lib/format'
import type { AdminCustomer } from '../../lib/types'
import { AdminDataTable, type AdminColumn } from '../../ui/AdminDataTable'
import { AdminFilterBar, AdminFilterSearch } from '../../ui/AdminFilters'
import { useConfirm } from '../../ui/ConfirmDialog'
import { Icon } from '../../ui/icons'
import {
  cardClass,
  Field,
  fieldClass,
  labelClass,
  Page,
  primaryButtonClass,
  secondaryButtonClass,
  tableActionClass,
  tableDangerActionClass,
} from '../../ui/Page'
import { Badge } from '../../ui/states'

type NewCustomer = {
  email: string
  password: string
  display_name: string
  staff_role?: 'admin'
}

export function AdminUsersPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [creating, setCreating] = useState(searchParams.get('new') === '1')
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const { confirm, dialog } = useConfirm()

  const list = useAdminList({
    resource: 'customers',
    filters: ['q'],
    fetch: (token, query) => listAdminCustomers(token, query),
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
    run: (token, body: NewCustomer) => createAdminCustomer(token, body),
    success: 'สร้างผู้ใช้สำเร็จ',
    invalidate: [list.cacheKey],
  })

  const update = useAdminMutation({
    run: (token, args: { id: string; body: Parameters<typeof updateAdminCustomer>[2] }) =>
      updateAdminCustomer(token, args.id, args.body),
    success: (_data, args) =>
      args.body.staff_role === 'admin'
        ? 'ให้สิทธิ์แอดมินสำเร็จ'
        : args.body.staff_role === 'none'
          ? 'ถอดสิทธิ์แอดมินสำเร็จ'
          : 'อัปเดตผู้ใช้สำเร็จ',
    invalidate: [list.cacheKey],
  })

  const remove = useAdminMutation({
    run: (token, id: string) => deleteAdminCustomer(token, id),
    success: 'ลบผู้ใช้สำเร็จ',
    invalidate: [list.cacheKey],
  })

  const askRemove = async (user: AdminCustomer) => {
    const ok = await confirm({
      title: `ลบผู้ใช้ ${user.email}?`,
      message: 'ลบได้เฉพาะผู้ใช้ที่ไม่มีการจอง — การลบย้อนกลับไม่ได้',
      confirmLabel: 'ลบผู้ใช้',
      danger: true,
    })
    if (ok) remove.mutate(user.id)
  }

  const columns: AdminColumn<AdminCustomer>[] = [
    { header: 'อีเมล', card: 'title', className: 'font-medium', cell: (user) => user.email },
    { header: 'ชื่อ', hide: 'md', cell: (user) => user.display_name ?? '—' },
    {
      header: 'บทบาท',
      card: 'badge',
      cell: (user) => (
        <Badge
          tone={user.role === 'admin' ? 'bg-accent-soft text-accent-text' : 'bg-elevated text-ink-muted'}
        >
          {user.role === 'admin' ? 'แอดมิน' : 'ลูกค้า'}
        </Badge>
      ),
    },
    { header: 'สถานะ', hide: 'md', className: 'capitalize', cell: (user) => user.status },
    {
      header: 'สร้างเมื่อ',
      hide: 'lg',
      className: 'whitespace-nowrap text-ink-muted',
      cell: (user) => formatDateTime(user.created_at),
    },
    {
      header: 'จัดการ',
      align: 'right',
      card: 'actions',
      cell: (user) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            className={tableActionClass}
            disabled={update.isPending}
            onClick={() =>
              update.mutate({
                id: user.id,
                body: { staff_role: user.role === 'admin' ? 'none' : 'admin' },
              })
            }
          >
            {user.role === 'admin' ? 'ถอดสิทธิ์' : 'ให้สิทธิ์แอดมิน'}
          </button>
          <button
            type="button"
            className={tableDangerActionClass}
            disabled={remove.isPending}
            onClick={() => void askRemove(user)}
          >
            ลบ
          </button>
        </div>
      ),
    },
  ]

  return (
    <Page
      title="ผู้ใช้ทดสอบ"
      wide
      action={
        <button
          type="button"
          className={creating ? secondaryButtonClass : primaryButtonClass}
          onClick={() => toggleCreating(!creating)}
        >
          {creating ? 'ยกเลิก' : '+ เพิ่มผู้ใช้'}
        </button>
      }
    >
      <p className="mb-4 text-sm text-ink-muted">
        สร้างบัญชีลูกค้าหรือแอดมินสำหรับทดสอบระบบ — รหัสผ่านจะแสดงครั้งเดียวหลังสร้างสำเร็จ
      </p>

      {credentials ? (
        <CredentialsCard credentials={credentials} onDismiss={() => setCredentials(null)} />
      ) : null}

      {creating ? (
        <CreateUserForm
          pending={create.isPending}
          onSubmit={(body) =>
            create.mutate(body, {
              onSuccess: (data) => {
                toggleCreating(false)
                setCredentials({ email: data.email, password: data.password })
              },
            })
          }
        />
      ) : null}

      <AdminFilterBar active={list.filtersActive} onClear={list.clearFilters}>
        <AdminFilterSearch
          paramValue={list.value('q')}
          placeholder="ค้นหาอีเมลหรือชื่อ…"
          onApply={(next) => list.setFilter('q', next)}
        />
      </AdminFilterBar>

      <AdminDataTable
        query={list.query}
        columns={columns}
        rowKey={(user) => user.id}
        errorMessage="โหลดรายชื่อผู้ใช้ไม่สำเร็จ"
        emptyMessage={list.filtersActive ? 'ไม่พบผู้ใช้ที่ค้นหา' : 'ยังไม่มีผู้ใช้ทดสอบ'}
        emptyHint={list.filtersActive ? 'ลองล้างตัวกรองแล้วค้นหาใหม่' : 'สร้างบัญชีแรกเพื่อใช้ทดสอบการจอง'}
        emptyAction={
          list.filtersActive
            ? { label: 'ล้างตัวกรอง', onClick: list.clearFilters }
            : { label: '+ เพิ่มผู้ใช้', onClick: () => toggleCreating(true) }
        }
        pagination={list.pagination}
      />

      {dialog}
    </Page>
  )
}

/** รหัสผ่านโชว์ครั้งเดียว - ต้องคัดลอกได้ในคลิกเดียว */
function CredentialsCard({
  credentials,
  onDismiss,
}: {
  credentials: { email: string; password: string }
  onDismiss: () => void
}) {
  const [copied, setCopied] = useState(false)

  return (
    <div className={`${cardClass} mb-4 border-ok/30 bg-ok-soft/30 p-4`}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ok-soft text-ok">
          <Icon name="check" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-ok">สร้างบัญชีแล้ว — เก็บรหัสผ่านนี้ไว้</p>
          <dl className="mt-2 grid gap-1 text-sm">
            <div className="flex gap-2">
              <dt className={labelClass}>อีเมล</dt>
              <dd className="min-w-0 truncate font-medium">{credentials.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className={labelClass}>รหัสผ่าน</dt>
              <dd className="font-mono font-medium">{credentials.password}</dd>
            </div>
          </dl>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className={tableActionClass}
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(`${credentials.email} / ${credentials.password}`)
                  .then(() => setCopied(true))
              }}
            >
              {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
            </button>
            <button type="button" className={tableActionClass} onClick={onDismiss}>
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateUserForm({
  pending,
  onSubmit,
}: {
  pending: boolean
  onSubmit: (body: NewCustomer) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [asAdmin, setAsAdmin] = useState(false)

  return (
    <form
      className={`${cardClass} mb-4 grid gap-3 p-4 sm:grid-cols-2`}
      onSubmit={(event) => {
        event.preventDefault()
        if (!email.trim() || !password.trim() || !displayName.trim()) return
        onSubmit({
          email: email.trim(),
          password: password.trim(),
          display_name: displayName.trim(),
          staff_role: asAdmin ? 'admin' : undefined,
        })
      }}
    >
      <Field label="อีเมล">
        <input
          className={fieldClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      <Field label="ชื่อที่แสดง">
        <input
          className={fieldClass}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
        />
      </Field>
      <Field label="รหัสผ่าน (อย่างน้อย 8 ตัว)">
        <div className="flex gap-2">
          <input
            className={fieldClass}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <button
            type="button"
            className={`${secondaryButtonClass} shrink-0 px-3`}
            onClick={() => setPassword(randomPassword())}
          >
            สุ่ม
          </button>
        </div>
      </Field>
      <Field label="สิทธิ์">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={asAdmin}
            onChange={(e) => setAsAdmin(e.target.checked)}
            className="size-4 rounded border-line-strong"
          />
          ให้สิทธิ์แอดมิน (เข้าหน้านี้ได้)
        </label>
      </Field>
      <div className="sm:col-span-2">
        <button type="submit" className={`${primaryButtonClass} w-auto min-w-32`} disabled={pending}>
          {pending ? 'กำลังสร้าง…' : 'สร้างผู้ใช้'}
        </button>
      </div>
    </form>
  )
}

/** รหัสผ่านทดสอบ - อ่านออกเสียงได้ ไม่มีอักขระที่สับสน */
function randomPassword(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = new Uint32Array(12)
  crypto.getRandomValues(bytes)
  return [...bytes].map((value) => alphabet[value % alphabet.length]).join('')
}
