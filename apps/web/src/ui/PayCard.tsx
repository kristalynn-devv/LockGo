import { Link } from 'react-router-dom'
import { money, statusLabel, statusTone } from '../lib/format'
import type { Reservation } from '../lib/types'
import { cardClass, labelClass, priceClass, primaryButtonClass } from './Page'
import { Badge } from './states'

export function PayCard({ item }: { item: Reservation }) {
  return (
    <section className={`${cardClass} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <p className={labelClass}>ชำระค่าบริการ</p>
        <Badge tone={statusTone(item.status, item.paid)}>{statusLabel(item.status, item.paid)}</Badge>
      </div>
      <h2 className="mt-1.5 text-lg font-semibold text-ink">{item.station_name}</h2>
      <p className="mt-1 text-sm text-ink-muted">
        {item.size} · {item.compartment_label}
      </p>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-line pt-3">
        <div>
          <p className={labelClass}>ยอดชำระ</p>
          <p className={priceClass}>{money(item.total_price)}</p>
        </div>
        <p className="max-w-40 text-right text-xs text-ink-muted">กรอกฟอร์มชำระในหน้าถัดไป</p>
      </div>

      <Link to={`/reservations/${item.id}/pay`} className={`${primaryButtonClass} mt-4 w-full`}>
        ชำระเงิน {money(item.total_price)}
      </Link>
    </section>
  )
}
