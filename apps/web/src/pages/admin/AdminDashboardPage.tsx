import { useQuery } from '@tanstack/react-query'
import { getAdminSummary } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { money } from '../../lib/format'
import { cardClass, cardGridClass, labelClass, Page, priceClass } from '../../ui/Page'
import { ErrorState, SkeletonList } from '../../ui/states'

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className={labelClass}>{label}</p>
      <p className={`${priceClass} mt-1.5 text-2xl`}>{value}</p>
    </div>
  )
}

export function AdminDashboardPage() {
  const { session } = useAuth()
  const token = session?.access_token ?? ''

  const summary = useQuery({
    queryKey: ['admin', 'summary', token],
    queryFn: () => getAdminSummary(token),
    enabled: Boolean(token),
  })

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

  const data = summary.data

  return (
    <Page title="สรุปภาพรวม" wide>
      <div className={cardGridClass}>
        <StatTile label="สถานีที่เปิดใช้งาน" value={`${data.stations.Open} / ${data.stations.total}`} />
        <StatTile label="ซ่อมบำรุง" value={String(data.stations.Maintenance)} />
        <StatTile label="ปิดใช้งาน" value={String(data.stations.Closed)} />
        <StatTile label="การจองที่ใช้งานวันนี้" value={String(data.reservations_active_today)} />
        <StatTile label="รายได้วันนี้" value={money(data.revenue_today)} />
        <StatTile label="รายได้เดือนนี้" value={money(data.revenue_this_month)} />
        <StatTile label="การจองทั้งหมด" value={String(data.reservations_total)} />
      </div>
    </Page>
  )
}
