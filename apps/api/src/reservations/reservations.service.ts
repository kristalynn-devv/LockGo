import { HttpStatus, Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNotNull, isNull, lt } from 'drizzle-orm';
import { ApiError } from '../common/http-error';
import { getDb, getSql } from '../db/database';
import { compartments, lockerStations, reservations } from '../db/schema';
import { mapReservationCreateError } from './reservation-errors';
import {
  assertOwner,
  canCancel,
  canDeposit,
  canPay,
  canPickup,
  effectiveStatus,
  isValidReservationWindow,
  visibleAccessCode,
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
  paidAt: Date | null;
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
      throw mapReservationCreateError(error);
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
    return this.transition(userId, id, {
      from: 'Reserved',
      to: 'Cancelled',
      paid: 'unpaid',
      allowed: (row) => canCancel(this.effectiveStatus(row), row.paidAt),
      code: 'CANNOT_CANCEL',
      message: 'Only an unpaid reserved booking can be cancelled',
    });
  }

  async pay(userId: string, id: string, method: 'promptpay' | 'card' | 'bank') {
    await this.expireOverdue();
    const row = await this.findRow(id);
    if (!row) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Reservation not found');
    }
    assertOwner(row.userId, userId);

    if (row.paidAt) {
      return this.presentRow(row);
    }

    if (!canPay(this.effectiveStatus(row), row.paidAt)) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'CANNOT_PAY',
        'Only an unpaid reserved booking can be paid',
      );
    }

    try {
      const sql = getSql();
      const rows = await sql<CreatedRow[]>`
        SELECT *
        FROM private.pay_lockgo_reservation(
          ${userId}::uuid,
          ${id}::uuid,
          ${method}::text
        )
      `;
      return this.present(rows[0]);
    } catch (error) {
      throw mapReservationCreateError(error);
    }
  }

  async deposit(userId: string, id: string) {
    return this.transition(userId, id, {
      from: 'Reserved',
      to: 'Active',
      paid: 'required',
      allowed: (row) => canDeposit(this.effectiveStatus(row), row.paidAt),
      code: 'CANNOT_DEPOSIT',
      message: 'Only a paid reserved booking can be used to deposit',
    });
  }

  async pickup(userId: string, id: string) {
    return this.transition(userId, id, {
      from: 'Active',
      to: 'Completed',
      allowed: (row) => canPickup(this.effectiveStatus(row)),
      code: 'CANNOT_PICKUP',
      message: 'Only an active booking can be used to pick up',
    });
  }

  private async transition(
    userId: string,
    id: string,
    step: {
      from: 'Reserved' | 'Active';
      to: 'Active' | 'Completed' | 'Cancelled';
      paid?: 'required' | 'unpaid';
      allowed: (row: ReservationRecord) => boolean;
      code: string;
      message: string;
    },
  ) {
    await this.expireOverdue();
    const row = await this.findRow(id);
    if (!row) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Reservation not found');
    }
    assertOwner(row.userId, userId);

    if (!step.allowed(row)) {
      throw new ApiError(HttpStatus.CONFLICT, step.code, step.message);
    }

    const filters = [eq(reservations.id, id), eq(reservations.status, step.from)];
    if (step.paid === 'required') {
      filters.push(isNotNull(reservations.paidAt));
    }
    if (step.paid === 'unpaid') {
      filters.push(isNull(reservations.paidAt));
    }

    const db = getDb();
    const [updated] = await db
      .update(reservations)
      .set({ status: step.to, updatedAt: new Date() })
      .where(and(...filters))
      .returning();

    if (!updated) {
      throw new ApiError(HttpStatus.CONFLICT, step.code, step.message);
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
        paidAt: reservations.paidAt,
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
      paid: row.paidAt != null,
      paid_at: row.paidAt ? new Date(row.paidAt).toISOString() : null,
      access_code: visibleAccessCode(row.reservationNumber, row.paidAt),
      unit_price: Number(row.unitPrice),
      duration_hours: row.durationHours,
      total_price: Number(row.totalPrice),
    };
  }
}
