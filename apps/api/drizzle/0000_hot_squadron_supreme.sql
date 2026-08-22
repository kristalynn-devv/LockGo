CREATE TYPE "public"."compartment_size" AS ENUM('Small', 'Medium', 'Large');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('Reserved', 'Active', 'Completed', 'Cancelled', 'Expired');--> statement-breakpoint
CREATE TYPE "public"."station_status" AS ENUM('Open', 'Maintenance', 'Closed');--> statement-breakpoint
CREATE TABLE "compartments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"station_id" uuid NOT NULL,
	"size" "compartment_size" NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"key" text NOT NULL,
	"reservation_id" uuid,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locker_stations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"latitude" numeric(9, 6) NOT NULL,
	"longitude" numeric(9, 6) NOT NULL,
	"status" "station_status" DEFAULT 'Open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "locker_stations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_number" text NOT NULL,
	"user_id" uuid NOT NULL,
	"compartment_id" uuid NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"no_show_deadline" timestamp with time zone NOT NULL,
	"status" "reservation_status" DEFAULT 'Reserved' NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"duration_hours" integer NOT NULL,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station_pricing" (
	"station_id" uuid NOT NULL,
	"size" "compartment_size" NOT NULL,
	"rate_per_hour" numeric(10, 2) NOT NULL,
	CONSTRAINT "station_pricing_station_id_size_pk" PRIMARY KEY("station_id","size")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "compartments" ADD CONSTRAINT "compartments_station_id_locker_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."locker_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_compartment_id_compartments_id_fk" FOREIGN KEY ("compartment_id") REFERENCES "public"."compartments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_pricing" ADD CONSTRAINT "station_pricing_station_id_locker_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."locker_stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "compartments_station_size_idx" ON "compartments" USING btree ("station_id","size");--> statement-breakpoint
CREATE UNIQUE INDEX "compartments_station_label_uidx" ON "compartments" USING btree ("station_id","label");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_user_key_uidx" ON "idempotency_keys" USING btree ("user_id","key");--> statement-breakpoint
CREATE INDEX "locker_stations_status_idx" ON "locker_stations" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "reservations_number_uidx" ON "reservations" USING btree ("reservation_number");--> statement-breakpoint
CREATE INDEX "reservations_user_idx" ON "reservations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reservations_compartment_time_idx" ON "reservations" USING btree ("compartment_id","start_time","end_time");--> statement-breakpoint
CREATE INDEX "reservations_status_deadline_idx" ON "reservations" USING btree ("status","no_show_deadline");