import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { getDb } from '../../db/database';
import {
  compartments,
  lockerStations,
  payments,
  reservations,
} from '../../db/schema';
import { ListAdminPaymentsQuery } from './dto/list-admin-payments.query';

@Injectable()
export class AdminPaymentsService {
  async list(query: ListAdminPaymentsQuery) {
    const db = getDb();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const filters = [];
    if (query.status) filters.push(eq(payments.status, query.status));
    if (query.method) filters.push(eq(payments.method, query.method));
    if (query.user_id) filters.push(eq(payments.userId, query.user_id));
    if (query.station_id)
      filters.push(eq(compartments.stationId, query.station_id));
    if (query.from) filters.push(gte(payments.createdAt, query.from));
    if (query.to) filters.push(lte(payments.createdAt, query.to));

    const rows = await db
      .select({
        id: payments.id,
        reservationId: payments.reservationId,
        reservationNumber: reservations.reservationNumber,
        userId: payments.userId,
        stationName: lockerStations.name,
        amount: payments.amount,
        currency: payments.currency,
        method: payments.method,
        status: payments.status,
        createdAt: payments.createdAt,
      })
      .from(payments)
      .innerJoin(reservations, eq(payments.reservationId, reservations.id))
      .innerJoin(compartments, eq(reservations.compartmentId, compartments.id))
      .innerJoin(lockerStations, eq(compartments.stationId, lockerStations.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const items = rows.map((row) => ({
      id: row.id,
      reservation_id: row.reservationId,
      reservation_number: row.reservationNumber,
      user_id: row.userId,
      station_name: row.stationName,
      amount: Number(row.amount),
      currency: row.currency,
      method: row.method,
      status: row.status,
      created_at: row.createdAt.toISOString(),
    }));

    return { items, page, limit };
  }
}
