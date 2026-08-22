import { HttpStatus, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ApiError } from '../common/http-error';
import { getDb, getSql } from '../db/database';
import { compartments, lockerStations, reservations } from '../db/schema';

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

  private async present(row: CreatedRow) {
    const db = getDb();
    const [detail] = await db
      .select({
        stationId: lockerStations.id,
        stationName: lockerStations.name,
        address: lockerStations.address,
        size: compartments.size,
        label: compartments.label,
      })
      .from(reservations)
      .innerJoin(compartments, eq(reservations.compartmentId, compartments.id))
      .innerJoin(lockerStations, eq(compartments.stationId, lockerStations.id))
      .where(eq(reservations.id, row.id));

    return {
      id: row.id,
      reservation_number: row.reservation_number,
      station_id: detail.stationId,
      station_name: detail.stationName,
      address: detail.address,
      size: detail.size,
      compartment_label: detail.label,
      start_time: new Date(row.start_time).toISOString(),
      end_time: new Date(row.end_time).toISOString(),
      no_show_deadline: new Date(row.no_show_deadline).toISOString(),
      status: row.status,
      unit_price: Number(row.unit_price),
      duration_hours: row.duration_hours,
      total_price: Number(row.total_price),
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
