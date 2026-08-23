import { HttpStatus, Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { ApiError } from '../../common/http-error';
import { getDb } from '../../db/database';
import { compartments, lockerStations, stationPricing } from '../../db/schema';
import { CreateCompartmentDto } from './dto/create-compartment.dto';
import { CreateStationDto } from './dto/create-station.dto';
import { ListAdminStationsQuery } from './dto/list-admin-stations.query';
import { UpdateStationDto } from './dto/update-station.dto';
import { UpsertPricingDto } from './dto/upsert-pricing.dto';

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  while (current && typeof current === 'object') {
    if ((current as { code?: string }).code === '23505') {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

@Injectable()
export class AdminStationsService {
  async list(query: ListAdminStationsQuery) {
    const db = getDb();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const stations = query.status
      ? await db
          .select()
          .from(lockerStations)
          .where(eq(lockerStations.status, query.status))
      : await db.select().from(lockerStations);

    const paged = stations.slice((page - 1) * limit, page * limit);
    const stationIds = paged.map((station) => station.id);
    const compartmentRows = stationIds.length
      ? await db
          .select()
          .from(compartments)
          .where(inArray(compartments.stationId, stationIds))
      : [];

    const items = paged.map((station) => ({
      id: station.id,
      name: station.name,
      address: station.address,
      latitude: Number(station.latitude),
      longitude: Number(station.longitude),
      status: station.status,
      compartment_count: compartmentRows.filter(
        (row) => row.stationId === station.id,
      ).length,
      created_at: station.createdAt.toISOString(),
    }));

    return { items, page, limit, total: stations.length };
  }

  async detail(id: string) {
    const station = await this.findStation(id);
    const db = getDb();
    const [compartmentRows, pricingRows] = await Promise.all([
      db.select().from(compartments).where(eq(compartments.stationId, id)),
      db.select().from(stationPricing).where(eq(stationPricing.stationId, id)),
    ]);

    return {
      id: station.id,
      name: station.name,
      address: station.address,
      latitude: Number(station.latitude),
      longitude: Number(station.longitude),
      status: station.status,
      created_at: station.createdAt.toISOString(),
      compartments: compartmentRows.map((row) => ({
        id: row.id,
        size: row.size,
        label: row.label,
      })),
      pricing: Object.fromEntries(
        pricingRows.map((row) => [row.size, Number(row.ratePerHour)]),
      ),
    };
  }

  async create(dto: CreateStationDto) {
    const db = getDb();
    const [row] = await db
      .insert(lockerStations)
      .values({
        name: dto.name,
        address: dto.address,
        latitude: String(dto.latitude),
        longitude: String(dto.longitude),
        status: dto.status ?? 'Open',
      })
      .returning();

    return this.detail(row.id);
  }

  async update(id: string, dto: UpdateStationDto) {
    await this.findStation(id);
    const db = getDb();

    const values: Partial<typeof lockerStations.$inferInsert> = {};
    if (dto.name != null) values.name = dto.name;
    if (dto.address != null) values.address = dto.address;
    if (dto.latitude != null) values.latitude = String(dto.latitude);
    if (dto.longitude != null) values.longitude = String(dto.longitude);
    if (dto.status != null) values.status = dto.status;

    if (Object.keys(values).length > 0) {
      await db
        .update(lockerStations)
        .set(values)
        .where(eq(lockerStations.id, id));
    }

    return this.detail(id);
  }

  async addCompartment(stationId: string, dto: CreateCompartmentDto) {
    await this.findStation(stationId);
    const db = getDb();

    try {
      await db.insert(compartments).values({
        stationId,
        size: dto.size,
        label: dto.label,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ApiError(
          HttpStatus.CONFLICT,
          'DUPLICATE_LABEL',
          'A compartment with that label already exists at this station',
        );
      }
      throw error;
    }

    return this.detail(stationId);
  }

  async upsertPricing(
    stationId: string,
    size: 'Small' | 'Medium' | 'Large',
    dto: UpsertPricingDto,
  ) {
    await this.findStation(stationId);
    const db = getDb();

    await db
      .insert(stationPricing)
      .values({ stationId, size, ratePerHour: String(dto.rate_per_hour) })
      .onConflictDoUpdate({
        target: [stationPricing.stationId, stationPricing.size],
        set: { ratePerHour: String(dto.rate_per_hour) },
      });

    return this.detail(stationId);
  }

  private async findStation(id: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(lockerStations)
      .where(eq(lockerStations.id, id));
    if (!row) {
      throw new ApiError(
        HttpStatus.NOT_FOUND,
        'NOT_FOUND',
        'Station not found',
      );
    }
    return row;
  }
}
