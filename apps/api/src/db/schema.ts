import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const stationStatus = pgEnum('station_status', [
  'Open',
  'Maintenance',
  'Closed',
]);

export const compartmentSize = pgEnum('compartment_size', [
  'Small',
  'Medium',
  'Large',
]);

export const reservationStatus = pgEnum('reservation_status', [
  'Reserved',
  'Active',
  'Completed',
  'Cancelled',
  'Expired',
]);

export const users = pgTable('users', {
  id: uuid('id').primaryKey(),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lockerStations = pgTable(
  'locker_stations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    address: text('address').notNull(),
    latitude: numeric('latitude', { precision: 9, scale: 6 }).notNull(),
    longitude: numeric('longitude', { precision: 9, scale: 6 }).notNull(),
    status: stationStatus('status').notNull().default('Open'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('locker_stations_status_idx').on(table.status)],
);

export const compartments = pgTable(
  'compartments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    stationId: uuid('station_id')
      .notNull()
      .references(() => lockerStations.id, { onDelete: 'cascade' }),
    size: compartmentSize('size').notNull(),
    label: text('label').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('compartments_station_size_idx').on(table.stationId, table.size),
    uniqueIndex('compartments_station_label_uidx').on(
      table.stationId,
      table.label,
    ),
  ],
);

export const stationPricing = pgTable(
  'station_pricing',
  {
    stationId: uuid('station_id')
      .notNull()
      .references(() => lockerStations.id, { onDelete: 'cascade' }),
    size: compartmentSize('size').notNull(),
    ratePerHour: numeric('rate_per_hour', { precision: 10, scale: 2 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.stationId, table.size] })],
);

export const reservations = pgTable(
  'reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    reservationNumber: text('reservation_number').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    compartmentId: uuid('compartment_id')
      .notNull()
      .references(() => compartments.id, { onDelete: 'restrict' }),
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    noShowDeadline: timestamp('no_show_deadline', {
      withTimezone: true,
    }).notNull(),
    status: reservationStatus('status').notNull().default('Reserved'),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    durationHours: integer('duration_hours').notNull(),
    totalPrice: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('reservations_number_uidx').on(table.reservationNumber),
    index('reservations_user_idx').on(table.userId),
    index('reservations_compartment_time_idx').on(
      table.compartmentId,
      table.startTime,
      table.endTime,
    ),
    index('reservations_status_deadline_idx').on(
      table.status,
      table.noShowDeadline,
    ),
  ],
);

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    reservationId: uuid('reservation_id').references(() => reservations.id, {
      onDelete: 'set null',
    }),
    responseBody: jsonb('response_body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('idempotency_keys_user_key_uidx').on(table.userId, table.key),
  ],
);
