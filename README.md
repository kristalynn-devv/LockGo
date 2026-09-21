# LockGo — Find & Reserve a Locker

Search for a smart locker near you, reserve a compartment ahead of time, pay, and get an unlock
code. Built as an AI Fullstack Engineer take-home against a fixed assessment and PRD; the locked
requirements are in [docs/requirements.md](./docs/requirements.md).

---

## 1. What it does

A signed-in user searches for stations near a place in Bangkok, sees availability split by
Small / Medium / Large, picks a date and time (up to 7 days ahead, 1–24 hours), sees the rate and
the total, and confirms. That returns a reservation number. Submitting the payment form calls a
Supabase function that records the payment — only then is an unlock code issued. From there the
locker can be opened to drop off or collect, and past reservations can be viewed or cancelled
while still unpaid.

**Customer side, this round:** search · station detail with available times · reserve · confirm ·
payment form · payment recorded in Supabase · simulated unlock · drop-off · collection · history ·
cancellation · no double-booking of a compartment · double-submit protection · real auth

**Admin side, this round:** overview of stations, reservations and revenue · station CRUD ·
add and remove compartments · size-based pricing · every customer's reservations and payments ·
create and delete test users, grant and revoke admin

**Deliberately out of scope (PRD §19):** a real payment gateway · real QR / Bluetooth unlocking ·
hardware · real push notifications · the live Google Maps API · production deployment

---

## 2. Architecture

Full diagram in [docs/architecture.md](./docs/architecture.md); ERD in [docs/erd.md](./docs/erd.md).

```
apps/web   React 19 + Vite + Tailwind     :5173
apps/api   NestJS                         :3000
Supabase   Auth + Postgres + Realtime
```

| Path | From → to | Carries |
| --- | --- | --- |
| Auth SDK | web → Supabase Auth | Google or email+password, returns a JWT |
| REST | web → NestJS `/api/*` | search, read, create, cancel, pay, drop off, collect |
| RPC | NestJS → `private.create_lockgo_reservation`, `private.pay_lockgo_reservation` | locks the compartment then inserts; writes `payments` and `paid_at` |
| Realtime | Supabase → web | a signal only — the client responds by invalidating queries |

Two decisions worth calling out. Reservation and payment both go through Postgres functions
rather than application code, so the compartment lock and the insert cannot drift apart. And
Realtime carries no payload: it says *something changed*, and the client refetches. A message
that carries state is a second source of truth waiting to disagree with the first.

| Layer | Choice | Why |
| --- | --- | --- |
| Data fetching | TanStack Query | caching and invalidation without hand-rolled state |
| Ticket QR | `qrcode.react` | a mock PromptPay QR on the payment screen, a ticket QR after |
| Styling | Tailwind CSS v4 | tokens in `index.css`, shared classes in `Page.tsx` — see [docs/design.md](./docs/design.md) |
| Backend | NestJS | guards, pipes, interceptors, Swagger and Jest in one place |
| ORM | Drizzle | schema in TypeScript, then hand-written SQL where `EXCLUDE` is needed |
| Database | Supabase Postgres | `btree_gist`, Realtime and Auth together |
| Auth | Supabase Auth | email/password so a reviewer can get in without configuring Google |

---

## 3. Installation

Node 22+ and [pnpm 11.5.1](https://pnpm.io/).

```bash
git clone https://github.com/kristalynn-devv/LockGo.git
cd LockGo
pnpm install
cp .env.example .env
```

Fill in `.env` (§4), run the database setup (§5), then start the app (§6).

### Windows — `setup.cmd` and `run.cmd`

| Script | When | What it does |
| --- | --- | --- |
| [`setup.cmd`](./setup.cmd) | first run, or after a clone | `pnpm install` → create `.env` from `.env.example` → `db:migrate` → `db:seed` |
| [`run.cmd`](./run.cmd) | every time after | checks `pnpm` and `.env`, then `pnpm dev` |

First time through: run `setup.cmd` (it stops after copying `.env` so you can fill it in), edit
`.env`, run `setup.cmd` again to migrate and seed, then `run.cmd` to bring up web on `:5173` and
the API on `:3000`.

Repo layout: `apps/api` · `apps/web` · `packages/shared` · `supabase/migrations` · `setup.cmd` · `run.cmd`

---

## 4. Configuration

Every variable is listed in [`.env.example`](./.env.example).

| Variable | Side | Where it comes from |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | web | Dashboard → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | web | publishable / anon key |
| `VITE_API_BASE_URL` | web | `http://localhost:3000` |
| `VITE_AUTH_REDIRECT_URL` | web | `http://localhost:5173/auth/callback` |
| `SUPABASE_URL` | api | same URL as above |
| `SUPABASE_SERVICE_ROLE_KEY` | api | service_role — never prefix this with `VITE_` |
| `SUPABASE_JWT_SECRET` | api | JWT secret from the Dashboard |
| `DATABASE_URL` | migrate / api | Postgres connection string |
| `PORT` | api | `3000` |

Vite reads `.env` from the repo root (`apps/web/vite.config.ts` sets `envDir`).

> `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` and `DATABASE_URL` are server-side values.
> A `VITE_` prefix would ship them to the browser.

On Windows, if `db.*.supabase.co` fails to resolve, the app, `pnpm db:migrate` and `pnpm db:seed`
fall back to the pooler at `aws-0-ap-southeast-2.pooler.supabase.com:6543` automatically.

---

## 5. Database setup

The Supabase project behind this repo is not usable by a reviewer — its keys are not committed.
You need your own instance. See [docs/requirements.md](./docs/requirements.md) for the full walk
through; the short version is create a Supabase project, put its values in `.env`, then:

```bash
pnpm db:migrate
pnpm db:seed
```

## 6. Running

```bash
pnpm dev        # web :5173 and api :3000 together
pnpm dev:web    # web only
pnpm dev:api    # api only
pnpm build      # build both
```

## Documentation

[requirements](./docs/requirements.md) · [architecture](./docs/architecture.md) ·
[ERD](./docs/erd.md) · [design](./docs/design.md) · [git workflow](./docs/git-workflow.md) ·
[AI workflow](./docs/ai-workflow.md) · [AI prompts](./docs/ai-prompts.md) ·
[AI code review](./docs/ai-code-review.md) · [debugging challenge](./docs/debugging-challenge.md)

## License

[MIT](./LICENSE) © 2026 Kristalyn Narongpiyawatha
