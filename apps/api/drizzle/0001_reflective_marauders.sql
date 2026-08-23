CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'THB' NOT NULL,
	"method" text DEFAULT 'promptpay' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idempotency_keys" DROP CONSTRAINT "idempotency_keys_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reservations" DROP CONSTRAINT "reservations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_reservation_uidx" ON "payments" USING btree ("reservation_id");--> statement-breakpoint
CREATE INDEX "payments_user_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_user_id_customers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "avatar_url";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "updated_at";