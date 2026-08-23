import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lt, lte } from 'drizzle-orm';
import { getDb } from '../../db/database';
import {
  compartments,
  customers,
  lockerStations,
  reservations,
} from '../../db/schema';
import { effectiveStatus } from '../../reservations/reservation-rules';
import { ListAdminReservationsQuery } from './dto/list-admin-reservations.query';

@Injectable()
export class AdminReservationsService {
  async list(query: ListAdminReservationsQuery) {
    await this.expireOverdue();

    const db = getDb();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filters = [];
    if (query.status) filters.push(eq(reservations.status, query.status));
    if (query.station_id)
      filters.push(eq(compartments.stationId, query.station_id));
    if (query.from) filters.push(gte(reservations.startTime, query.from));
    if (query.to) filters.push(lte(reservations.startTime, query.to));

    const rows = await db
      .select({
        id: reservations.id,
        reservationNumber: reservations.reservationNumber,
        userId: reservations.userId,
        customerName: customers.displayName,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        noShowDeadline: reservations.noShowDeadline,
        status: reservations.status,
        unitPrice: reservations.unitPrice,
        durationHours: reservations.durationHours,
        totalPrice: reservations.totalPrice,
        paidAt: reservations.paidAt,
        stationId: lockerStations.id,
        stationName: lockerStations.name,
        size: compartments.size,
        label: compartments.label,
      })
      .from(reservations)
      .innerJoin(compartments, eq(reservations.compartmentId, compartments.id))
      .innerJoin(lockerStations, eq(compartments.stationId, lockerStations.id))
      .innerJoin(customers, eq(reservations.userId, customers.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(reservations.startTime))
      .limit(limit)
      .offset((page - 1) * limit);

    const items = rows.map((row) => ({
      id: row.id,
      reservation_number: row.reservationNumber,
      user_id: row.userId,
      customer_name: row.customerName,
      station_id: row.stationId,
      station_name: row.stationName,
      size: row.size,
      compartment_label: row.label,
      start_time: row.startTime.toISOString(),
      end_time: row.endTime.toISOString(),
      status: effectiveStatus({
        status: row.status,
        noShowDeadline: row.noShowDeadline,
      }),
      paid: row.paidAt != null,
      paid_at: row.paidAt ? row.paidAt.toISOString() : null,
      unit_price: Number(row.unitPrice),
      duration_hours: row.durationHours,
      total_price: Number(row.totalPrice),
    }));

    return { items, page, limit };
  }

  private async expireOverdue() {
    const db = getDb();
    await db
      .update(reservations)
      .set({ status: 'Expired', updatedAt: new Date() })
      .where(
        and(
          eq(reservations.status, 'Reserved'),
          lt(reservations.noShowDeadline, new Date()),
        ),
      );
  }
}
