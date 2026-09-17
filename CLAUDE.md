# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LockGo is a take-home assessment: a Bangkok smart-locker search & reservation app. Requirements are locked in `docs/requirements.md` — do not treat requirement changes as in-scope without checking that file. The README and all `docs/` files are written in Thai.

Two independently deployable apps in one pnpm workspace, talking only over HTTP/JWT (not a shared git repo, but also not a shared process):

```
apps/web         React 19 + Vite + Tailwind v4      :5173
apps/api         NestJS                              :3000
packages/shared  cross-app types/constants (@lockgo/shared)
Supabase         Auth + Postgres + Realtime
```

## Commands

Requires Node 22+ and pnpm 11.5.1. `pnpm install` at the root, then `cp .env.example .env` and fill in Supabase values before running the DB or app (see `.env.example` for what each var is for; `apps/web/vite.config.ts` reads `.env` from the repo root, not `apps/web`).

```bash
pnpm dev                 # web + api together (--parallel --filter @lockgo/api --filter @lockgo/web)
pnpm dev:api             # api only
pnpm dev:web             # web only
pnpm build               # build both apps

pnpm db:generate         # drizzle-kit generate (new migration from schema.ts changes)
pnpm db:migrate          # apps/api/src/db/run-migrations.ts — Drizzle tables, THEN supabase/migrations/*.sql
pnpm db:seed             # apps/api/src/db/seed.ts — test users via Supabase Auth API + Bangkok stations
```

Never run `drizzle-kit push` — migrations must go through `db:migrate` so the hand-written SQL (RLS, exclusion constraint, RPCs) applies after the Drizzle tables exist. Re-running `db:migrate` on an already-migrated DB is safe; it skips applied migrations.

Tests:

```bash
pnpm --filter @lockgo/api test                              # unit tests, no .env needed
pnpm --filter @lockgo/api test:e2e -- lockers.e2e-spec.ts    # needs .env pointed at a migrated+seeded DB
pnpm --filter @lockgo/api test:e2e -- reservations.e2e-spec.ts
pnpm --filter @lockgo/api exec tsc -p tsconfig.build.json --noEmit   # typecheck api
```

Web has no unit tests; its CI gate is lint + typecheck + build:

```bash
pnpm --filter @lockgo/web lint     # oxlint
pnpm --filter @lockgo/web build    # tsc -b, then vite build
```

CI (`.github/workflows/ci.yml`) has two jobs: `unit` (no DB — api unit tests, api typecheck, web build) and `e2e` (boots a local Supabase stack via the Supabase CLI, then migrate → seed → api e2e). The `e2e` job's flow is exactly README §6 "ทางที่ 2" (Supabase CLI + Docker) — if you need to reproduce CI locally, follow that path.

Seeded test accounts (from `pnpm db:seed`): `alice.lockgo@example.com` / `LockGo-Alice-1` (customer), `bob.lockgo@example.com` / `LockGo-Bob-1` (second customer, for concurrent-booking/403 cases), `carol.lockgo@example.com` / `LockGo-Carol-1` (staff — has a `public.users` row, can reach `/admin`).

## Architecture

### Everything reservation-related routes through Nest — never through the Supabase Data API from the browser

`apps/web` only holds a Supabase publishable key, used for two things: Auth (login/session/JWT) and Realtime (subscribing to `reservations` changes). It never reads or writes locker/reservation data directly against Supabase. All search, booking, cancellation, payment, deposit, and pickup go through `apps/web/src/lib/api.ts` → NestJS `/api/*` with `Authorization: Bearer <jwt>`, which `AuthGuard` verifies against `SUPABASE_JWT_SECRET`.

Why: double-booking prevention lives in one SQL function (`private.create_lockgo_reservation`), which does `FOR UPDATE` row locking plus relies on a Postgres `EXCLUDE USING gist` constraint on `reservations` (overlapping time ranges on the same compartment, for `status IN ('Reserved','Active')`). There must be exactly one call site for that function — Nest — or the guarantee breaks. Payment is the same pattern: web posts a `method` to Nest, Nest calls `private.pay_lockgo_reservation`, which writes `payments` + `paid_at`; web never writes payment rows itself.

Realtime is a signal only, never a data source: when `reservations` changes, the Supabase Realtime subscription in `apps/web/src/lib/realtime.tsx` just triggers `invalidateQueries` (TanStack Query) so the UI refetches from Nest. Availability truth always comes from Nest / the locking SQL function, never from the realtime payload.

Double-tap protection is two independent layers, don't conflate them:
1. **Client**: Confirm buttons are `disabled` while `isPending` (mutation in flight) — this only stops a second click from the same tap, not two different users racing for the same compartment.
2. **Server**: `POST /api/reservations` requires an `Idempotency-Key` header; `reservations/idempotency.interceptor.ts` + the `idempotency_keys` table (unique on `(user_id, key)`) makes retries of the same logical request return the original reservation instead of creating a second one. This is a different problem from the `EXCLUDE` constraint above — one guards against duplicate requests from one user, the other guards against two different users grabbing the same slot.

### Nest module boundaries (`apps/api/src`)

| Module | Path | Responsibility |
|---|---|---|
| Auth | `auth/auth.guard.ts`, `admin.guard.ts` | JWT verification; `AdminGuard` additionally checks the caller has a `public.users` row with `role = 'admin'`. Always paired: `@UseGuards(AuthGuard, AdminGuard)`. |
| Lockers | `lockers/` | `GET /api/lockers`, `/locations`, `/{id}` — search, filters, per-size availability |
| Reservations | `reservations/` | create/list/get/cancel/pay/deposit/pickup; payment goes through `pay_lockgo_reservation`; create goes through the idempotency interceptor |
| Me | `me/` | `GET /api/me` — returns `role` (`admin` or `user`) so `apps/web` can route the caller correctly |
| Admin | `admin/{stations,reservations,payments,summary,customers}` | station/compartment/pricing CRUD, cross-customer reservation & payment views, dashboard summary, test-user creation/role grant — every route requires `AuthGuard` + `AdminGuard` |
| Pricing | inside `lockers`/`reservations` services | `max(rate_per_hour × duration_hours, 30)` — ฿30 minimum |

Route paths have no `/v1` prefix and never use the word "bookings" (it's "reservations" throughout, both in code and API paths) — this is a locked naming decision, not an oversight.

### Staff (`public.users`) is a separate table from customers (`public.customers`), not a role column

Every signed-up user gets a `public.customers` row automatically via a Postgres trigger (`private.handle_new_user`) mirroring `auth.users`. Staff/admin is a **second**, manually-populated table (`public.users`, `role` currently constrained to `'admin'` only) — there is no self-serve staff signup. A staff member still has a `customers` row too (from the trigger), but the frontend keeps the two experiences fully separate: `apps/web`'s `useIsAdmin()` hook calls `GET /api/me` and `ProtectedLayout` (customer routes) redirects admins to `/admin`, while `AdminLayout` redirects non-admins to `/`. There is no cross-navigation link between the two. See `docs/erd.md` for the full rationale (`auth.users` is Supabase-owned identity/session data; `customers`/`users` are LockGo's own domain profile tables, so RLS and ownership checks bind to `public.customers.id`, never to JWT `user_metadata`, which callers can edit).

Both `customers` and `users` have a `status` column (`active`/`inactive`). `users.status = 'inactive'` is enforced by `AdminGuard` (instant 403 even if the row still exists). `customers.status` exists but nothing currently enforces it.

### Database layer (`apps/api/src/db`, `supabase/migrations/`)

Schema is split across two sources, applied in order by `run-migrations.ts` — Drizzle first, then hand-written SQL:
- `apps/api/drizzle/` — Drizzle-generated migrations for the core tables (`locker_stations`, `compartments`, `station_pricing`, `reservations`, `payments`, `idempotency_keys`, `customers`, `users`), defined in TypeScript in `apps/api/src/db/schema.ts`.
- `supabase/migrations/*.sql` — hand-written SQL for things Drizzle can't express directly: the `auth.users` → `public.customers` sync trigger, the reservation-locking RPC (`private.create_lockgo_reservation`) and its `EXCLUDE` constraint, RLS policies, the payment RPC (`private.pay_lockgo_reservation`), and the staff/role/status columns.

Reservation status enum: `Reserved → Active (deposit) → Completed (pickup)`, or `Cancelled`/`Expired`. `no_show_deadline` (`start_time + 15min`) is distinct from `end_time`; reservations past that deadline get swept to `Expired` inside the locking RPC before it looks for available compartments. The locker access code is derived from the reservation number at read time and only ever returned once `paid_at` is set — it's not a stored column.

## Docs map

The README (root) covers install/config/DB-setup/run/test/API endpoints in full detail — read it before re-deriving any of that. Deeper docs, all in Thai:

| File | Content |
|---|---|
| `docs/requirements.md` | Locked requirements and decided values — source of truth for scope |
| `docs/architecture.md` | Data-flow diagrams, module boundary table (source for most of the Architecture section above) |
| `docs/erd.md` | Full schema + relationship rationale, why staff/customers are split |
| `docs/design.md` | Design tokens, page/button/card patterns currently in use |
| `docs/git-workflow.md` | Commit/branch conventions for this repo |
| `docs/ai-workflow.md`, `docs/ai-prompts.md`, `docs/ai-code-review.md`, `docs/debugging-challenge.md` | Assessment-specific AI-usage writeups (not needed for day-to-day dev) |
