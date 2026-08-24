import { Link } from 'react-router-dom'
import { getAdminSummary } from '../../lib/api'
import { useAdminQuery } from '../../lib/adminQuery'
import { money } from '../../lib/format'
import type { AdminSummary } from '../../lib/types'
import { Icon, type IconName } from '../../ui/icons'
import {
  cardClass,
  labelClass,
  Page,
  priceClass,
  secondaryButtonClass,
  SectionLabel,
} from '../../ui/Page'
import { ErrorState, SkeletonList } from '../../ui/states'

type Tone = 'accent' | 'ok' | 'warn' | 'danger' | 'muted'

const TONE_CLASS: Record<Tone, string> = {
  accent: 'bg-accent-soft text-accent-text',
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-elevated text-ink-muted',
}

type Tile = {
  label: string
  value: string
  icon: IconName
  tone: Tone
  hint?: string
  /** กดแล้วไปหน้ารายการที่กรองไว้ให้แล้ว */
  to?: string
}

function StatTile({ tile }: { tile: Tile }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className={labelClass}>{tile.label}</p>
        <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${TONE_CLASS[tile.tone]}`}>
          <Icon name={tile.icon} className="size-4" />
        </span>
      </div>
      <p className={`${priceClass} mt-2 text-2xl`}>{tile.value}</p>
      {tile.hint ? <p className="mt-1 text-xs text-ink-muted">{tile.hint}</p> : null}
    </>
  )

  if (!tile.to) {
    return <div className={`${cardClass} p-4`}>{body}</div>
  }

  return (
    <Link
      to={tile.to}
      className={`${cardClass} block p-4 transition-colors hover:border-accent-line hover:bg-elevated`}
    >
      {body}
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent-text">
        ดูรายการ
        <Icon name="chevron" className="size-3 -rotate-90" />
      </span>
    </Link>
  )
}

/** ตัวเลขสำคัญมาก่อน แล้วค่อยแยกตามสถานะสถานี */
function tiles(data: AdminSummary): { section: string; items: Tile[] }[] {
  return [
    {
      section: 'ภาพรวมวันนี้',
      items: [
        {
          label: 'รายได้วันนี้',
          value: money(data.revenue_today),
          icon: 'card',
          tone: 'ok',
        },
        {
          label: 'รายได้เดือนนี้',
          value: money(data.revenue_this_month),
          icon: 'card',
          tone: 'accent',
        },
        {
          label: 'การจองที่ใช้งานวันนี้',
          value: String(data.reservations_active_today),
          icon: 'clock',
          tone: 'accent',
          to: '/admin/reservations?status=Active',
        },
        {
          label: 'การจองทั้งหมด',
          value: String(data.reservations_total),
          icon: 'calendar',
          tone: 'muted',
          to: '/admin/reservations',
        },
      ],
    },
    {
      section: 'สถานะสถานี',
      items: [
        {
          label: 'เปิดใช้งาน',
          value: `${data.stations.Open} / ${data.stations.total}`,
          hint: 'จากสถานีทั้งหมดในระบบ',
          icon: 'check',
          tone: 'ok',
          to: '/admin/stations?status=Open',
        },
        {
          label: 'ซ่อมบำรุง',
          value: String(data.stations.Maintenance),
          icon: 'alert',
          tone: 'warn',
          to: '/admin/stations?status=Maintenance',
        },
        {
          label: 'ปิดใช้งาน',
          value: String(data.stations.Closed),
          icon: 'close',
          tone: 'danger',
          to: '/admin/stations?status=Closed',
        },
      ],
    },
  ]
}

const QUICK_ACTIONS: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin/stations?new=1', label: 'เพิ่มสถานีใหม่', icon: 'building' },
  { to: '/admin/users?new=1', label: 'เพิ่มผู้ใช้ทดสอบ', icon: 'user' },
  { to: '/admin/reservations?status=Reserved', label: 'ตรวจการจองที่รอชำระ', icon: 'clock' },
  { to: '/admin/payments', label: 'ดูประวัติการชำระเงิน', icon: 'card' },
]

export function AdminDashboardPage() {
  const summary = useAdminQuery(['admin', 'summary'], getAdminSummary)

  if (summary.isLoading) {
    return (
      <Page title="สรุปภาพรวม" wide>
        <SkeletonList count={4} />
      </Page>
    )
  }

  if (summary.isError || !summary.data) {
    return (
      <Page title="สรุปภาพรวม" wide>
        <ErrorState
          message="โหลดข้อมูลสรุปไม่สำเร็จ"
          hint="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้"
          onRetry={() => void summary.refetch()}
        />
      </Page>
    )
  }

  return (
    <Page
      title="สรุปภาพรวม"
      wide
      action={
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={summary.isFetching}
          onClick={() => void summary.refetch()}
        >
          {summary.isFetching ? 'กำลังรีเฟรช…' : 'รีเฟรช'}
        </button>
      }
    >
      <div className="grid gap-6">
        {tiles(summary.data).map((group) => (
          <section key={group.section} className="grid gap-2.5">
            <SectionLabel>{group.section}</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {group.items.map((tile) => (
                <StatTile key={tile.label} tile={tile} />
              ))}
            </div>
          </section>
        ))}

        <section className="grid gap-2.5">
          <SectionLabel>ทางลัด</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={`${cardClass} flex items-center gap-3 p-4 transition-colors hover:border-accent-line hover:bg-elevated`}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text">
                  <Icon name={action.icon} className="size-[18px]" />
                </span>
                <span className="min-w-0 text-sm font-medium">{action.label}</span>
                <Icon name="chevron" className="ml-auto size-3.5 -rotate-90 text-ink-faint" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </Page>
  )
}
