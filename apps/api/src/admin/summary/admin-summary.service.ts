import { Injectable } from '@nestjs/common';
import { getSql } from '../../db/database';

@Injectable()
export class AdminSummaryService {
  async summary() {
    const sql = getSql();

    const [stationRows, activeToday, revenue, reservationsTotal] =
      await Promise.all([
        sql<{ status: string; n: number }[]>`
        SELECT status, count(*)::int AS n
        FROM public.locker_stations
        GROUP BY status
      `,
        sql<{ n: number }[]>`
        SELECT count(*)::int AS n
        FROM public.reservations
        WHERE status IN ('Reserved', 'Active')
          AND start_time >= date_trunc('day', now())
          AND start_time < date_trunc('day', now()) + interval '1 day'
      `,
        sql<{ today: string | null; this_month: string | null }[]>`
        SELECT
          COALESCE(sum(amount) FILTER (WHERE created_at >= date_trunc('day', now())), 0) AS today,
          COALESCE(sum(amount) FILTER (WHERE created_at >= date_trunc('month', now())), 0) AS this_month
        FROM public.payments
        WHERE status = 'completed'
      `,
        sql<{ n: number }[]>`
        SELECT count(*)::int AS n FROM public.reservations
      `,
      ]);

    const stations = { Open: 0, Maintenance: 0, Closed: 0 };
    for (const row of stationRows) {
      if (row.status in stations) {
        stations[row.status as keyof typeof stations] = row.n;
      }
    }
    const stationTotal = stations.Open + stations.Maintenance + stations.Closed;

    return {
      stations: { ...stations, total: stationTotal },
      reservations_active_today: activeToday[0]?.n ?? 0,
      revenue_today: Number(revenue[0]?.today ?? 0),
      revenue_this_month: Number(revenue[0]?.this_month ?? 0),
      reservations_total: reservationsTotal[0]?.n ?? 0,
    };
  }
}
