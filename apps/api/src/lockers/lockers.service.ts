import { HttpStatus, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { ApiError } from '../common/http-error';
import { getDb, getSql } from '../db/database';
import {
  compartments,
  lockerStations,
  reservations,
  stationPricing,
} from '../db/schema';
import { MOCK_LOCATIONS, resolveOrigin } from '../locations';
import { PricingService } from '../pricing/pricing.service';
import {
  freeHourRanges,
  isCompartmentFree,
  LiveReservation,
  Size,
} from './availability';
import { ListLockersQuery } from './dto/list-lockers.query';
import {
  isSearchableStation,
  matchesLockerFilters,
  sortLockers,
} from './locker-filters';

const SIZES: Size[] = ['Small', 'Medium', 'Large'];

@Injectable()
export class LockersService {
  constructor(private readonly pricing: PricingService) {}

  locations() {
    return MOCK_LOCATIONS;
  }

  async list(query: ListLockersQuery) {
    const origin = this.originFrom(query);
    const window = this.windowFrom(query);
    const snapshot = await this.loadOpenStations();

    const distances = origin
      ? await this.distancesFromSql(
          origin,
          snapshot.map((station) => station.id),
        )
      : new Map<string, number>();

    const rows = snapshot
      .map((station) => {
        const distanceKm = distances.get(station.id);
        const available = this.countsFor(station, window);
        const rates = Object.fromEntries(
          station.rates.map((rate) => [rate.size, Number(rate.ratePerHour)]),
        ) as Record<Size, number>;
        const startingPrice = this.pricing.total(
          Math.min(...station.rates.map((rate) => Number(rate.ratePerHour))),
          1,
        );

        return {
          id: station.id,
          name: station.name,
          address: station.address,
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
          status: station.status,
          distance_km:
            distanceKm == null ? null : Math.round(distanceKm * 10) / 10,
          available,
          starting_price: startingPrice,
          rates,
          availability_mode: query.start_time ? 'window' : 'now',
        };
      })
      .filter((row) => matchesLockerFilters(row, query));

    return { items: sortLockers(rows, query.sort) };
  }

  async detail(id: string, query: ListLockersQuery) {
    const snapshot = await this.loadOpenStations();
    const station = snapshot.find((item) => item.id === id);
    if (!station) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Locker not found');
    }

    const window = this.windowFrom(query);
    const available = this.countsFor(station, window);
    const rates = Object.fromEntries(
      station.rates.map((rate) => [rate.size, Number(rate.ratePerHour)]),
    ) as Record<Size, number>;

    return {
      id: station.id,
      name: station.name,
      address: station.address,
      latitude: Number(station.latitude),
      longitude: Number(station.longitude),
      status: station.status,
      available,
      rates,
      starting_price: this.pricing.total(
        Math.min(...station.rates.map((rate) => Number(rate.ratePerHour))),
        1,
      ),
      available_time: this.availableTime(station),
      operating_hours: '24 hours',
    };
  }

  private async distancesFromSql(
    origin: { latitude: number; longitude: number },
    stationIds: string[],
  ) {
    if (stationIds.length === 0) {
      return new Map<string, number>();
    }

    const sql = getSql();
    const rows = await sql<{ id: string; km: number }[]>`
      SELECT
        id::text,
        (
          6371 * 2 * atan2(
            sqrt(
              sin(radians(latitude::float8 - ${origin.latitude}) / 2)
                * sin(radians(latitude::float8 - ${origin.latitude}) / 2)
              + cos(radians(${origin.latitude}))
                * cos(radians(latitude::float8))
                * sin(radians(longitude::float8 - ${origin.longitude}) / 2)
                * sin(radians(longitude::float8 - ${origin.longitude}) / 2)
            ),
            sqrt(
              1 - (
                sin(radians(latitude::float8 - ${origin.latitude}) / 2)
                  * sin(radians(latitude::float8 - ${origin.latitude}) / 2)
                + cos(radians(${origin.latitude}))
                  * cos(radians(latitude::float8))
                  * sin(radians(longitude::float8 - ${origin.longitude}) / 2)
                  * sin(radians(longitude::float8 - ${origin.longitude}) / 2)
              )
            )
          )
        ) AS km
      FROM public.locker_stations
      WHERE id IN ${sql(stationIds)}
    `;

    return new Map(rows.map((row) => [row.id, Number(row.km)]));
  }

  private originFrom(query: ListLockersQuery) {
    if (query.latitude != null && query.longitude != null) {
      return { latitude: query.latitude, longitude: query.longitude };
    }
    const mock = resolveOrigin(query.location);
    if (mock) {
      return { latitude: mock.latitude, longitude: mock.longitude };
    }
    return undefined;
  }

  private windowFrom(query: ListLockersQuery) {
    if (query.start_time && query.duration) {
      const start = query.start_time;
      const end = new Date(start.getTime() + query.duration * 60 * 60 * 1000);
      return { start, end };
    }
    const start = new Date();
    return { start, end: new Date(start.getTime() + 60 * 1000) };
  }

  private countsFor(
    station: Awaited<ReturnType<LockersService['loadOpenStations']>>[number],
    window: { start: Date; end: Date },
  ) {
    const available = { Small: 0, Medium: 0, Large: 0 };
    for (const compartment of station.compartments) {
      if (
        isCompartmentFree(
          compartment.id,
          station.reservations,
          window.start,
          window.end,
        )
      ) {
        available[compartment.size] += 1;
      }
    }
    return available;
  }

  private availableTime(
    station: Awaited<ReturnType<LockersService['loadOpenStations']>>[number],
  ) {
    const from = new Date();
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result = {} as Record<Size, { start: string; end: string }[]>;

    for (const size of SIZES) {
      const ofSize = station.compartments
        .filter((item) => item.size === size)
        .map((item) => item.id);
      result[size] = freeHourRanges(
        ofSize,
        station.reservations,
        from,
        to,
      ).map((slot) => ({
        start: slot.start.toISOString(),
        end: slot.end.toISOString(),
      }));
    }

    return result;
  }

  private async loadOpenStations() {
    const db = getDb();
    const stations = await db
      .select()
      .from(lockerStations)
      .where(eq(lockerStations.status, 'Open'));
    const openStations = stations.filter((station) =>
      isSearchableStation(station.status),
    );
    if (openStations.length === 0) {
      return [];
    }

    const stationIds = openStations.map((station) => station.id);
    const [compartmentRows, priceRows, reservationRows] = await Promise.all([
      db
        .select()
        .from(compartments)
        .where(inArray(compartments.stationId, stationIds)),
      db
        .select()
        .from(stationPricing)
        .where(inArray(stationPricing.stationId, stationIds)),
      db
        .select()
        .from(reservations)
        .where(
          and(
            inArray(reservations.status, ['Reserved', 'Active']),
            gte(reservations.endTime, new Date()),
          ),
        ),
    ]);

    return openStations.map((station) => ({
      ...station,
      compartments: compartmentRows.filter((row) => row.stationId === station.id),
      rates: priceRows.filter((row) => row.stationId === station.id),
      reservations: reservationRows
        .filter((row) =>
          compartmentRows.some(
            (compartment) =>
              compartment.id === row.compartmentId &&
              compartment.stationId === station.id,
          ),
        )
        .map(
          (row): LiveReservation => ({
            compartmentId: row.compartmentId,
            startTime: row.startTime,
            endTime: row.endTime,
            status: row.status,
            noShowDeadline: row.noShowDeadline,
          }),
        ),
    }));
  }
}
