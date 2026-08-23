import { HttpStatus, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, lt } from 'drizzle-orm';
import { ApiError } from '../common/http-error';
import { getDb, getSql } from '../db/database';
import { compartments, lockerStations, reservations } from '../db/schema';
import {
  assertOwner,
  canCancel,
  effectiveStatus,
  isValidReservationWindow,
} from './reservation-rules';

type CreatedRow = {
  id: string;
  reservation_number: string;
  user_id: string;
  compartment_id: string;
  start_time: Date;
  end_time: Date;
  no_show_deadline: Date;
  status: string;
  unit_price: string;
  duration_hours: number;
  total_price: string;
};

type ReservationRecord = typeof reservations.$inferSelect;

type ReservationDetail = {
  id: string;
  reservationNumber: string;
  startTime: Date;
  endTime: Date;
  noShowDeadline: Date;
  status: string;
  unitPrice: string;
  durationHours: number;
  totalPrice: string;
  stationId: string;
  stationName: string;
  address: string;
  size: string;
  label: string;
};

@Injectable()
export class ReservationsService {
  async create(
    userId: string,
    input: {
      station_id: string;
      size: 'Small' | 'Medium' | 'Large';
      start_time: Date;
      duration_hours: number;
    },
  ) {
    if (!isValidReservationWindow(input.start_time, input.duration_hours)) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'INVALID_RESERVATION',
        'The selected time is not valid',
      );
    }

    try {
      const sql = getSql();
      const rows = await sql<CreatedRow[]>`
        SELECT *
        FROM private.create_lockgo_reservation(
          ${userId}::uuid,
          ${input.station_id}::uuid,
          ${input.size}::public.compartment_size,
          ${input.start_time.toISOString()}::timestamptz,
          ${input.duration_hours}::int
        )
      `;
      return this.present(rows[0]);
    } catch (error) {
      throw this.mapCreateError(error);
    }
  }

  async getById(userId: string, id: string) {
    await this.expireOverdue();
    const row = await this.findRow(id);
    if (!row) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Reservation not found');
    }
    assertOwner(row.userId, userId);
    return this.presentRow(row);
  }

  async list(userId: string) {
    await this.expireOverdue();
    const db = getDb();
    const rows = await db
      .select({ id: reservations.id })
      .from(reservations)
      .where(eq(reservations.userId, userId))
      .orderBy(desc(reservations.startTime));

    const items = await this.presentMany(rows.map((row) => row.id));
    return { items };
  }

  async cancel(userId: string, id: string) {
    await this.expireOverdue();
    const row = await this.findRow(id);
    if (!row) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Reservation not found');
    }
    assertOwner(row.userId, userId);

    if (!canCancel(this.effectiveStatus(row))) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'CANNOT_CANCEL',
        'Only a reserved booking can be cancelled',
      );
    }

    const db = getDb();
    const [updated] = await db
      .update(reservations)
      .set({ status: 'Cancelled', updatedAt: new Date() })
      .where(and(eq(reservations.id, id), eq(reservations.status, 'Reserved')))
      .returning();

    if (!updated) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'CANNOT_CANCEL',
        'Only a reserved booking can be cancelled',
      );
    }

    return this.presentRow(updated);
  }

  private effectiveStatus(
    row: { status: string; noShowDeadline: Date },
    at = new Date(),
  ) {
    return effectiveStatus(row, at);
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

  private async findRow(id: string): Promise<ReservationRecord | undefined> {
    const db = getDb();
    const [row] = await db.select().from(reservations).where(eq(reservations.id, id));
    return row;
  }

  private async present(row: CreatedRow) {
    const [item] = await this.presentMany([row.id]);
    return item;
  }

  private async presentRow(row: ReservationRecord) {
    const [item] = await this.presentMany([row.id]);
    return item;
  }

  private async presentMany(ids: string[]) {
    if (ids.length === 0) {
      return [];
    }

    const db = getDb();
    const details = await db
      .select({
        id: reservations.id,
        reservationNumber: reservations.reservationNumber,
        startTime: reservations.startTime,
        endTime: reservations.endTime,
        noShowDeadline: reservations.noShowDeadline,
        status: reservations.status,
        unitPrice: reservations.unitPrice,
        durationHours: reservations.durationHours,
        totalPrice: reservations.totalPrice,
        stationId: lockerStations.id,
        stationName: lockerStations.name,
        address: lockerStations.address,
        size: compartments.size,
        label: compartments.label,
      })
      .from(reservations)
      .innerJoin(compartments, eq(reservations.compartmentId, compartments.id))
      .innerJoin(lockerStations, eq(compartments.stationId, lockerStations.id))
      .where(inArray(reservations.id, ids));

    const byId = new Map(details.map((row) => [row.id, row]));
    return ids.map((id) => this.toResponse(byId.get(id)!));
  }

  private toResponse(row: ReservationDetail) {
    return {
      id: row.id,
      reservation_number: row.reservationNumber,
      station_id: row.stationId,
      station_name: row.stationName,
      address: row.address,
      size: row.size,
      compartment_label: row.label,
      start_time: new Date(row.startTime).toISOString(),
      end_time: new Date(row.endTime).toISOString(),
      no_show_deadline: new Date(row.noShowDeadline).toISOString(),
      status: this.effectiveStatus({
        status: row.status,
        noShowDeadline: row.noShowDeadline,
      }),
      unit_price: Number(row.unitPrice),
      duration_hours: row.durationHours,
      total_price: Number(row.totalPrice),
    };
  }

  private mapCreateError(error: unknown): ApiError {
    const code = (error as { code?: string }).code;
    const message = (error as { message?: string }).message ?? '';

    if (message.includes('NO_AVAILABILITY') || code === '23P01') {
      return new ApiError(
        HttpStatus.CONFLICT,
        'NO_AVAILABILITY',
        'That locker is no longer available for the selected time',
      );
    }
    if (message.includes('STATION_UNAVAILABLE')) {
      return new ApiError(
        HttpStatus.CONFLICT,
        'STATION_UNAVAILABLE',
        'This locker is not open for booking',
      );
    }
    if (
      message.includes('START_IN_PAST') ||
      message.includes('START_TOO_FAR') ||
      message.includes('INVALID_DURATION')
    ) {
      return new ApiError(
        HttpStatus.BAD_REQUEST,
        'INVALID_RESERVATION',
        'The selected time is not valid',
      );
    }
    if (message.includes('STATION_NOT_FOUND') || message.includes('USER_NOT_FOUND')) {
      return new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Resource not found');
    }

    return new ApiError(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL_ERROR',
      'Something went wrong. Please try again.',
    );
  }
}
