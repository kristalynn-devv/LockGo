import { HttpStatus, Injectable } from '@nestjs/common';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { ApiError } from '../common/http-error';
import { getDb } from '../db/database';
import {
  compartments,
  lockerStations,
  reservations,
  stationPricing,
} from '../db/schema';
import { haversineKm, MOCK_LOCATIONS, resolveOrigin } from '../locations';
import { PricingService } from '../pricing/pricing.service';
import {
  isCompartmentFree,
  LiveReservation,
  Size,
} from './availability';
import { ListLockersQuery } from './dto/list-lockers.query';

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

    const rows = snapshot
      .map((station) => {
        const distanceKm = origin
          ? haversineKm(
              origin.latitude,
              origin.longitude,
              Number(station.latitude),
              Number(station.longitude),
            )
          : null;
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
            distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
          available,
          starting_price: startingPrice,
          rates,
          availability_mode: query.start_time ? 'window' : 'now',
        };
      })
      .filter((row) => {
        if (
          query.location &&
          !resolveOrigin(query.location) &&
          !row.name.toLowerCase().includes(query.location.toLowerCase()) &&
          !row.address.toLowerCase().includes(query.location.toLowerCase())
        ) {
          return false;
        }
        if (query.distance != null && row.distance_km != null) {
          if (row.distance_km > query.distance) {
            return false;
          }
        }
        if (query.size && row.available[query.size] === 0) {
          return false;
        }
        if (query.price != null && row.starting_price > query.price) {
          return false;
        }
        if (query.available_only) {
          const total = SIZES.reduce((sum, size) => sum + row.available[size], 0);
          if (total === 0) {
            return false;
          }
        }
        return true;
      });

    return { items: rows };
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
      const ofSize = station.compartments.filter((item) => item.size === size);
      const slots: { start: Date; end: Date }[] = [];
      const cursor = new Date(from);
      cursor.setMinutes(0, 0, 0);
      if (cursor < from) {
        cursor.setHours(cursor.getHours() + 1);
      }

      while (cursor < to) {
        const end = new Date(cursor.getTime() + 60 * 60 * 1000);
        const free = ofSize.some((compartment) =>
          isCompartmentFree(
            compartment.id,
            station.reservations,
            cursor,
            end,
          ),
        );
        if (free) {
          slots.push({ start: new Date(cursor), end });
        }
        cursor.setHours(cursor.getHours() + 1);
      }

      result[size] = mergeSlots(slots)
        .slice(0, 3)
        .map((slot) => ({
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
    if (stations.length === 0) {
      return [];
    }

    const stationIds = stations.map((station) => station.id);
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

    return stations.map((station) => ({
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

function mergeSlots(slots: { start: Date; end: Date }[]) {
  if (slots.length === 0) {
    return [];
  }
  const merged = [{ ...slots[0] }];
  for (const slot of slots.slice(1)) {
    const last = merged[merged.length - 1];
    if (slot.start.getTime() <= last.end.getTime()) {
      last.end = slot.end;
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}
