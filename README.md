# LockGo — Find & Reserve Locker

ระบบค้นหาและจองช่อง Smart Locker ล่วงหน้า  
Take-home ของ AI Fullstack Engineer ตาม Assessment + PRD — ข้อกำหนดที่ล็อกแล้วอยู่ที่ [docs/requirements.md](./docs/requirements.md)

---

## 1. Project Overview

ผู้ใช้ล็อกอินแล้วค้นหาตู้ใกล้สถานที่ในกรุงเทพ ดูช่องว่างแยก Small / Medium / Large เลือกวันเวลา (ล่วงหน้าได้ 7 วัน ระยะ 1–24 ชม.) เห็นเรทกับยอดรวม แล้วยืนยันการจอง ได้หมายเลขการจอง กรอกฟอร์มชำระแล้วฟังก์ชันบน Supabase เขียนรายการชำระจึงจะได้รหัสเปิดตู้ เปิดตู้เพื่อฝากหรือรับของ และดูประวัติหรือยกเลิกใบที่ยังไม่จ่าย

**ทำในรอบนี้ — ฝั่งลูกค้า:** ค้นหา · รายละเอียด + Available Time · จอง · ยืนยัน · ฟอร์มชำระ · ชำระบน Supabase · เปิดตู้จำลอง · ฝากของ · รับของ · ประวัติ · ยกเลิก · กันจองซ้อนที่ช่อง · กันกดซ้ำ · Auth จริง

**ทำในรอบนี้ — ฝั่งแอดมิน:** สรุปภาพรวม (สถานี/การจอง/รายได้) · CRUD สถานี · เพิ่ม/ลบช่องล็อกเกอร์ · ตั้งเรทราคาตามขนาด · ดูการจองและการชำระของลูกค้าทุกคน · สร้าง/ลบผู้ใช้ทดสอบและให้-ถอดสิทธิ์แอดมิน

**ไม่ทำตาม PRD §19:** Payment Gateway จริง · QR / Bluetooth Unlock จริง · Hardware · Push Notification จริง · Google Maps API จริง · Production Deployment

---

## 2. Architecture

แผนภาพเต็ม: [docs/architecture.md](./docs/architecture.md) · ERD: [docs/erd.md](./docs/erd.md)

```
apps/web   React 19 + Vite + Tailwind     :5173
apps/api   NestJS                         :3000
Supabase   Auth + Postgres + Realtime
```

| เส้น | จาก → ถึง | ใช้ทำ |
|------|-----------|--------|
| Auth SDK | web → Supabase Auth | Google / email+password ได้ JWT |
| REST | web → Nest `/api/*` | ค้นหา ดูจอง สร้างจอง ยกเลิก ชำระ ฝาก รับ |
| RPC | Nest → `private.create_lockgo_reservation` · `private.pay_lockgo_reservation` | ล็อกช่องแล้ว INSERT · เขียน `payments` + `paid_at` |
| Realtime | Supabase → web | สัญญาณแล้ว `invalidateQueries` เท่านั้น |

อ่านและเขียนการจองเดินผ่าน Nest ทั้งหมด เพราะกฎจองซ้อนอยู่ที่ SQL ฟังก์ชันเดียว หน้าบ้านถือได้แค่ publishable key

---

## 3. Technology

| ชั้น | เลือกใช้ | เหตุผล |
|------|---------|--------|
| Monorepo | pnpm workspace | สองแอปหนึ่งสัญญา HTTP ไม่แยก git repo |
| Frontend | React 19 + Vite + TypeScript | ทำ 4 หน้าจอ + ประวัติได้เร็ว มี Vite 8 อยู่แล้ว |
| Routing | React Router 7 | เส้นทางลูกค้ากับแอดมินแยก layout กันด้วย guard คนละตัว |
| Server state | TanStack Query 5 | cache + invalidate หลัง mutation ที่เดียว · Realtime ยิงแค่สัญญาณให้ refetch |
| Toast | `sonner` | แจ้งผลบันทึก/ลบในหน้าแอดมิน ไม่ต้องมีแบนเนอร์ค้างในทุกหน้า |
| Ticket QR | `qrcode.react` | วาด QR พร้อมเพย์จำลองบนหน้าจ่าย และ QR ตั๋วเปิดตู้หลังชำระ |
| Styling | Tailwind CSS v4 | token ใน `index.css` · class ร่วมใน `Page.tsx` — ดู [docs/design.md](./docs/design.md) |
| Backend | NestJS | guard / pipe / interceptor / Swagger / Jest อยู่ในที่เดียว |
| ORM | Drizzle | schema เป็น TypeScript แล้วตามด้วย SQL มือสำหรับ EXCLUDE |
| Database | Supabase Postgres | ได้ `btree_gist` + Realtime + Auth |
| Auth | Supabase Auth | Bonus 5 · email/password ให้ผู้ตรวจเข้าได้โดยไม่ตั้ง Google |

---

## 4. Installation

ต้องมี Node 22+ และ [pnpm 11.5.1](https://pnpm.io/)

```bash
git clone https://github.com/kristalynn-devv/LockGo.git
cd LockGo
pnpm install
cp .env.example .env
```

จากนั้นเติมค่าใน `.env` ตามหัวข้อ 5–6 แล้วทำ Database Setup (§6) ก่อนรันแอป (§7)

### Windows — `setup.cmd` + `run.cmd`

สคริปต์ที่ราก repo (double-click หรือรันจาก cmd):

| สคริปต์ | ใช้เมื่อ | ทำอะไร |
|---------|---------|--------|
| [`setup.cmd`](./setup.cmd) | ครั้งแรก / หลัง clone | `pnpm install` → สร้าง `.env` จาก `.env.example` → `db:migrate` → `db:seed` |
| [`run.cmd`](./run.cmd) | รันปกติทุกครั้ง | เช็ค `pnpm` + `.env` แล้ว `pnpm dev` |

ลำดับครั้งแรก:

1. `setup.cmd` — ถ้ายังไม่มี `.env` จะ copy จาก `.env.example` แล้วหยุดให้เติมค่า
2. แก้ `.env` ตาม §5–6 (Supabase URL, keys, `DATABASE_URL`)
3. `setup.cmd` อีกครั้ง — migrate + seed
4. `run.cmd` — เปิด Web `:5173` + API `:3000`

โครง repo: `apps/api` · `apps/web` · `packages/shared` · `supabase/migrations` · `setup.cmd` · `run.cmd`

---

## 5. Configuration

ตัวแปรทั้งหมดอยู่ใน [`.env.example`](./.env.example)

| ตัวแปร | ฝั่ง | ที่มา |
|--------|------|--------|
| `VITE_SUPABASE_URL` | web | Dashboard → API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | web | publishable / anon key |
| `VITE_API_BASE_URL` | web | `http://localhost:3000` |
| `VITE_AUTH_REDIRECT_URL` | web | `http://localhost:5173/auth/callback` |
| `SUPABASE_URL` | api | URL เดียวกับด้านบน |
| `SUPABASE_SERVICE_ROLE_KEY` | api | service_role — ห้ามขึ้นต้น `VITE_` |
| `SUPABASE_JWT_SECRET` | api | JWT Secret จาก Dashboard |
| `DATABASE_URL` | migrate / api | Connection string ของ Postgres |
| `PORT` | api | `3000` |

Vite อ่าน `.env` ที่ราก repo (`apps/web/vite.config.ts` ตั้ง `envDir`)

> `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` และ `DATABASE_URL` เป็นค่าฝั่งเซิร์ฟเวอร์ ห้ามใส่ prefix `VITE_`

บน Windows ถ้า `db.*.supabase.co` resolve ไม่ได้ แอป, `pnpm db:migrate` และ `pnpm db:seed` จะสลับไป pooler `aws-0-ap-southeast-2.pooler.supabase.com:6543` ให้อัตโนมัติ

---

## 6. Database Setup

ผู้ตรวจใช้โปรเจกต์ Supabase ของ repo นี้ไม่ได้ เพราะ key ห้าม commit ต้องมีฐานของตัวเอง

### ทางที่ 1 — สร้าง Supabase project (ทางที่ใช้ส่งงานนี้)

1. สร้างโปรเจกต์ที่ [supabase.com](https://supabase.com)
2. Authentication → Providers → เปิด Email
3. Authentication → URL Configuration → เพิ่ม `http://localhost:5173/auth/callback`
4. คัดลอก URL, publishable key, service_role, JWT secret, และ Database connection string ลง `.env`
5. รัน migrate แล้ว seed

```bash
pnpm db:migrate
pnpm db:seed
```

Windows: `setup.cmd` (ขั้น migrate + seed ทำอัตโนมัติเมื่อมี `.env` แล้ว)

**migrate เอา schema จากไหน?** ไม่ได้ดึงข้อมูลจากที่อื่น — นำ SQL ใน repo ไปสร้างโครงสร้างบน Postgres ของคุณ (ผ่าน `DATABASE_URL`):

| แหล่ง | โฟลเดอร์ | เนื้อหา |
|-------|----------|---------|
| Drizzle | `apps/api/drizzle/` | ตารางหลัก (stations, compartments, reservations, …) |
| SQL มือ | `supabase/migrations/` | auth sync, EXCLUDE กันจองซ้อน, RLS, `paid_at` + `payments`, RPC จอง/ชำระ |

**seed เอาข้อมูลจากไหน?** hardcode ใน `apps/api/src/db/seed.ts` — สร้างบัญชี Alice/Bob/Carol ผ่าน Supabase Auth API, ใส่สถานีตู้ 11 แห่งในกรุงเทพ, และเพิ่ม Carol ลงตาราง `public.users` (พนักงาน) ให้เป็น admin

`db:migrate` รัน [`apps/api/src/db/run-migrations.ts`](./apps/api/src/db/run-migrations.ts) — Drizzle ก่อน แล้วตามด้วย SQL มือ **ห้ามใช้ `drizzle-kit push`**  
ถ้ารันซ้ำบนฐานที่มีตารางแล้ว สคริปต์จะข้ามชุดที่ลงไปแล้ว ไม่ต้องลบโปรเจกต์ทิ้ง

### ทางที่ 2 — Supabase CLI + Docker

```bash
npx supabase start
```

เอา URL / anon / service_role / DB จาก `npx supabase status` ใส่ `.env` แล้วรัน `pnpm db:migrate` กับ `pnpm db:seed` (Windows: `setup.cmd`) เหมือนทางที่ 1 Google OAuth ใช้บน local stack ไม่ได้ — ใช้ email/password

### บัญชีทดสอบ (สร้างโดย seed)

| อีเมล | รหัสผ่าน | ใช้ทำอะไร |
|-------|----------|-----------|
| `alice.lockgo@example.com` | `LockGo-Alice-1` | ลูกค้าหลัก เดิน journey จอง |
| `bob.lockgo@example.com` | `LockGo-Bob-1` | ลูกค้าคนที่สอง เทสต์ 403 และจองพร้อมกัน |
| `carol.lockgo@example.com` | `LockGo-Carol-1` | พนักงาน — อยู่ในตาราง `public.users` มีสิทธิ์เข้า `/admin`, Alice/Bob เข้าไม่ได้ |

หลัง `pnpm db:seed` มีตู้และใบจองสำหรับเดินเคส (รันซ้ำได้ ชุด `LK-SEED-*` จะถูกลบแล้วใส่ใหม่):

| รายการ | ใช้เทสต์ |
|--------|----------|
| LockGo Thonglor — Medium = 0 | AC-03 เลือก Medium ไม่ได้ |
| LockGo Ekkamai — Medium เหลือ 1 ช่อง | AC-06 สองคนจองพร้อมกัน สำเร็จได้ใบเดียว |
| LockGo Ari Premium — เริ่มต้น ฿45 | ชิป **ไม่เกิน ฿30** ตัดออก · **ไม่เกิน ฿45** ยังอยู่ |
| LockGo Don Mueang — ไกล Si Lom | จุด Si Lom + ระยะ 1–5 km ตัดออก |
| LockGo On Nut (Maintenance) / Sala Daeng (Closed) | ไม่ขึ้นค้นหา (AC-09) |
| LockGo National Stadium — ช่องเดียวถูกจองตอนนี้ | ชิป **ว่างเท่านั้น** ตัดออก (ใบ `LK-SEED-STADIUM-NOW` มีอายุ 15 นาทีหลัง seed) |
| `LK-SEED-ALICE-CANCEL` Reserved | ยกเลิกจากประวัติ (AC-16) · ยิงซ้ำด้วย `Idempotency-Key: seed-alice-repeat` (AC-05) · ยกเลิกแล้วให้ Bob จองช่วงเดิมได้ (AC-18) |
| `LK-SEED-ALICE-CANCELLED` / `LK-SEED-ALICE-EXPIRED` | ประวัติสถานะ · ยกเลิกใบพวกนี้ไม่ได้ (AC-17) |
| `LK-SEED-ALICE-NOSHOW` Reserved เลยเดดไลน์ | เปิดประวัติหรือใบแล้วเป็น Expired และไม่กันช่อง (AC-19) |
| `LK-SEED-BOB-LARGE` Reserved ที่ Mo Chit Large (+6 ชม.) | Alice จอง Large ช่วงเดียวกันได้ 409 · Bob เห็นใบนี้ Alice ไม่เห็น (AC-14) · Alice เปิดใบนี้ได้ 403 (AC-15) |

### ตั้งค่า Google OAuth (ไม่บังคับ)

ถ้าไม่ตั้ง ยังล็อกอินด้วยอีเมลด้านบนได้ครบทุกฟีเจอร์

1. Google Cloud → APIs & Services → OAuth consent screen (External)
2. สร้าง OAuth client แบบ Web
3. Authorized redirect URI ให้เป็น Callback URL ของ Supabase (`https://<ref>.supabase.co/auth/v1/callback`)
4. เอา Client ID / Secret ไปใส่ Supabase → Authentication → Google
5. เพิ่ม `http://localhost:5173/auth/callback` ใน Redirect URLs ของ Supabase

---

## 7. Run Application

```bash
pnpm dev
```

Windows:

```cmd
run.cmd
```

`run.cmd` รัน web + api พร้อมกัน (`pnpm --parallel --filter @lockgo/api --filter @lockgo/web dev`) — ต้องมี `.env` แล้ว ไม่ทำ install/migrate/seed

- Web: http://localhost:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

ล็อกอินด้วย Alice แล้วเดิน Find → Detail → Reserve → Confirm → History

หยุด dev server — กด `Ctrl+C` ในหน้าต่างที่รันอยู่ หรือปิด terminal ถ้า port ค้าง (Windows):

```cmd
netstat -ano | findstr ":3000 :5173"
taskkill /PID <pid> /F /T
```

---

## 8. Run Test

ไม่ต้องมี `.env` สำหรับ unit test

```bash
pnpm --filter @lockgo/api test
```

ครอบคลุม AC ที่ทดสอบบน Node ได้โดยไม่ต้องมี `.env`: ตัวกรองราคาเริ่มต้น · ตู้ซ่อมไม่ขึ้นค้นหา · ขั้นต่ำ ฿30 · Medium 4 ชม. = ฿60 · เวลาจอง 1–24 ชม. / ไม่เกิน 7 วัน · 401 ไม่มี token · ยกเลิกได้เฉพาะ Reserved · Expired หลัง 15 นาที · 400 ไม่มี Idempotency-Key

Integration / e2e ต้องมี `.env` ที่ชี้โปรเจกต์ที่ migrate + seed แล้ว

```bash
pnpm --filter @lockgo/api test:e2e -- lockers.e2e-spec.ts
pnpm --filter @lockgo/api test:e2e -- reservations.e2e-spec.ts
```

ครอบคลุม: ตัวกรองค้นหา · จองสำเร็จ · เต็มแล้ว 409 · idempotency · Alice/Bob พร้อมกัน · ยกเลิกแล้วจองใหม่

### รันบน CI

`.github/workflows/ci.yml` มีสอง job

| Job | ฐานข้อมูล | รันอะไร |
|-----|-----------|---------|
| `unit` | ไม่ใช้ | unit test ทั้งชุด + typecheck api + build web |
| `e2e` | Supabase local stack ที่ CLI ยกขึ้นบน runner | `db:migrate` → `db:seed` → e2e ทั้งชุด |

job `e2e` ไม่ต้องใช้ secret ใน GitHub เพราะ key ของ local stack เป็นค่าคงที่ของ CLI —
ขั้นตอนเดียวกับ README §6 ทางที่ 2 เป๊ะ ๆ ถ้า CI เขียว แปลว่าเส้นทางที่เขียนไว้ในเอกสารนี้รันได้จริง

ตรวจหน้าบ้าน — ยังไม่มี unit test ฝั่ง web ใช้ typecheck + lint + build เป็นด่านแทน

```bash
pnpm --filter @lockgo/web lint     # oxlint
pnpm --filter @lockgo/web build    # tsc -b แล้วค่อย vite build
```

---

## 9. API Documentation

Swagger UI: http://localhost:3000/api/docs  
ทุกเส้นต้องมี `Authorization: Bearer <access_token>`  
`POST /api/reservations` ต้องมี `Idempotency-Key`

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/lockers/locations` | สถานที่จำลองในกรุงเทพ |
| GET | `/api/lockers` | ค้นหาตู้ ตัวกรอง location หรือ latitude+longitude, distance, size, price, available_only, start_time, duration, sort |
| GET | `/api/lockers/{id}` | รายละเอียด + Available Time รายขนาด |
| POST | `/api/reservations` | สร้างการจอง |
| GET | `/api/reservations` | ประวัติของตัวเอง |
| GET | `/api/reservations/{id}` | ดูใบจอง เจ้าของเท่านั้น |
| PATCH | `/api/reservations/{id}/cancel` | ยกเลิกใบ Reserved ที่ยังไม่จ่าย |
| PATCH | `/api/reservations/{id}/pay` | ฟอร์มส่ง `method` แล้วฟังก์ชันบน Supabase เขียน `payments` + `paid_at` |
| PATCH | `/api/reservations/{id}/deposit` | เปิดตู้จำลองแล้วฝากของ — Reserved ที่จ่ายแล้ว → Active |
| PATCH | `/api/reservations/{id}/pickup` | เปิดตู้จำลองแล้วรับของ — Active → Completed |
| GET | `/api/me` | id/email/role ของ token นี้ — `role: "admin"` ถ้ามีแถวใน `public.users` |

เส้นทางด้านล่างต้องเป็นพนักงาน (มีแถวใน `public.users`) ไม่งั้น `403 FORBIDDEN` — ดู [docs/architecture.md](./docs/architecture.md#หน้าแอดมิน-staff-แยกจากลูกค้า)

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/admin/summary` | ตัวเลขสรุป: สถานีตามสถานะ, การจองที่ใช้งานวันนี้, รายได้วันนี้/เดือนนี้, การจองทั้งหมด |
| GET, POST | `/api/admin/stations` | ดูรายการ / เพิ่มสถานี |
| GET, PATCH | `/api/admin/stations/{id}` | รายละเอียด (รวมช่อง+ราคา) / แก้ไขสถานี |
| DELETE | `/api/admin/stations/{id}` | ลบสถานี — ติดการจองอยู่ตอบ `409 HAS_RESERVATIONS` |
| POST | `/api/admin/stations/{id}/compartments` | เพิ่มช่องล็อกเกอร์ |
| DELETE | `/api/admin/stations/{id}/compartments/{compartmentId}` | ลบช่อง — ติดการจองอยู่ตอบ `409 HAS_RESERVATIONS` |
| PUT | `/api/admin/stations/{id}/pricing/{size}` | ตั้ง/แก้ราคาต่อชั่วโมงตามขนาด |
| GET | `/api/admin/reservations` | การจองของลูกค้าทุกคน กรองสถานะ/สถานี/ช่วงเวลาได้ |
| GET | `/api/admin/payments` | ประวัติการชำระเงินของลูกค้าทุกคน |
| GET | `/api/admin/customers` | รายชื่อผู้ใช้ ค้นหาด้วยอีเมลหรือชื่อ |
| POST | `/api/admin/customers` | สร้างผู้ใช้ทดสอบ (ยืนยันอีเมลให้เลย) — ส่ง `staff_role: "admin"` เพื่อให้สิทธิ์แอดมินตั้งแต่แรก · ตอบรหัสผ่านกลับมาครั้งเดียว |
| PATCH | `/api/admin/customers/{id}` | แก้ชื่อ/สถานะ · `staff_role: "admin" \| "none"` = ให้/ถอดสิทธิ์แอดมิน |
| DELETE | `/api/admin/customers/{id}` | ลบผู้ใช้ทั้งใน Auth และฐานข้อมูล — ติดการจองอยู่ตอบ `409 HAS_RESERVATIONS` |

Error รูปเดียวทั้งระบบ: `{ statusCode, code, message }`

---

## 10. AI Tools

ใช้ Cursor Agent อ่าน Assessment + PRD แล้วลงมือตามบล็อก คนล็อกกฎใน `docs/requirements.md` §25

รอบหลัง (หน้าแอดมิน + รีแฟกเตอร์) ใช้ Claude ผ่าน Cowork — แยกชั้นกลางของหน้าแอดมิน
(`lib/adminQuery.ts`, `ui/AdminDataTable.tsx`), ไล่หาสาเหตุที่ `/admin` ช้า (guard ยิง Supabase ทุก request,
`GET /admin/stations` ดึงทั้งตารางมา slice ใน JS, คีย์ cache ผูกกับ access token) และสรุปกฎธุรกิจกับ schema
คนเป็นคนตัดสินใจว่าจะรับข้อไหน

| ไฟล์ | เนื้อหา |
|------|---------|
| [docs/ai-workflow.md](./docs/ai-workflow.md) | ขั้นไหน AI ทำ ขั้นไหนคนตัดสินใจ |
| [docs/ai-prompts.md](./docs/ai-prompts.md) | prompt จริง ≥ 4 อัน |
| [docs/ai-code-review.md](./docs/ai-code-review.md) | รีวิว interceptor กันกดซ้ำ 5 ด้าน |
| [docs/debugging-challenge.md](./docs/debugging-challenge.md) | เคสกด Confirm สองครั้ง |

วิธีใช้ git: [docs/git-workflow.md](./docs/git-workflow.md)

---

## เอกสารเพิ่มเติม

| ไฟล์ | เนื้อหา |
|------|---------|
| [docs/requirements.md](./docs/requirements.md) | ข้อกำหนดรวมและค่าที่ตัดสินแล้ว |
| [docs/design.md](./docs/design.md) | Token, โครงหน้า, ปุ่ม/การ์ดที่ใช้อยู่ตอนนี้ |
| [docs/erd.md](./docs/erd.md) | ความสัมพันธ์ และเหตุผลที่ user แยกสองตาราง |
| [docs/architecture.md](./docs/architecture.md) | เส้น read / write / realtime |
