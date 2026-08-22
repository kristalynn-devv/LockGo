# LockGo — Find & Reserve Locker

ระบบค้นหาและจองช่อง Smart Locker ล่วงหน้า  
Take-home ของ AI Fullstack Engineer ตาม Assessment + PRD — ข้อกำหนดที่ล็อกแล้วอยู่ที่ [docs/requirements.md](./docs/requirements.md)

---

## 1. Project Overview

ผู้ใช้ล็อกอินแล้วค้นหาตู้ใกล้สถานที่ในกรุงเทพ ดูช่องว่างแยก Small / Medium / Large เลือกวันเวลา (ล่วงหน้าได้ 7 วัน ระยะ 1–24 ชม.) เห็นเรทกับยอดรวม แล้วยืนยันการจอง ได้หมายเลขการจอง และดูประวัติหรือยกเลิกใบที่ยัง Reserved

**ทำในรอบนี้:** ค้นหา · รายละเอียด + Available Time · จอง · ยืนยัน · ประวัติ · ยกเลิก · กันจองซ้อนที่ช่อง · กันกดซ้ำ · Auth จริง

**ไม่ทำตาม PRD §19:** Payment Gateway จริง · QR / Bluetooth Unlock · Hardware · Push Notification จริง · Google Maps API จริง · Production Deployment

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
| REST | web → Nest `/api/*` | ค้นหา ดูจอง สร้างจอง ยกเลิก |
| RPC | Nest → `private.create_lockgo_reservation` | ล็อกช่องแล้ว INSERT |
| Realtime | Supabase → web | สัญญาณแล้ว `invalidateQueries` เท่านั้น |

อ่านและเขียนการจองเดินผ่าน Nest ทั้งหมด เพราะกฎจองซ้อนอยู่ที่ SQL ฟังก์ชันเดียว หน้าบ้านถือได้แค่ publishable key

---

## 3. Technology

| ชั้น | เลือกใช้ | เหตุผล |
|------|---------|--------|
| Monorepo | pnpm workspace | สองแอปหนึ่งสัญญา HTTP ไม่แยก git repo |
| Frontend | React 19 + Vite + TypeScript | ทำ 4 หน้าจอ + ประวัติได้เร็ว มี Vite 8 อยู่แล้ว |
| Styling | Tailwind CSS v4 | responsive ตาม design token โดยไม่เขียน CSS แยก |
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

จากนั้นเติมค่าใน `.env` ตามหัวข้อ 5–6 แล้วค่อยรันแอป

โครง repo: `apps/api` · `apps/web` · `packages/shared` · `supabase/migrations`

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
5. รัน

```bash
pnpm db:migrate
pnpm db:seed
```

`db:migrate` รัน Drizzle จาก `apps/api/drizzle/` แล้วตามด้วย SQL มือใน `supabase/migrations/` (trigger, EXCLUDE, RLS) **ห้ามใช้ `drizzle-kit push`**

### ทางที่ 2 — Supabase CLI + Docker

```bash
npx supabase start
```

เอา URL / anon / service_role / DB จาก `npx supabase status` ใส่ `.env` แล้วรัน `pnpm db:migrate` กับ `pnpm db:seed` เหมือนทางที่ 1 Google OAuth ใช้บน local stack ไม่ได้ — ใช้ email/password

### บัญชีทดสอบ (สร้างโดย seed)

| อีเมล | รหัสผ่าน | ใช้ทำอะไร |
|-------|----------|-----------|
| `alice.lockgo@example.com` | `LockGo-Alice-1` | ผู้ใช้หลัก เดิน journey จอง |
| `bob.lockgo@example.com` | `LockGo-Bob-1` | คนที่สอง เทสต์ 403 และจองพร้อมกัน |

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

- Web: http://localhost:5173
- API: http://localhost:3000
- Swagger: http://localhost:3000/api/docs

ล็อกอินด้วย Alice แล้วเดิน Find → Detail → Reserve → Confirm → History

---

## 8. Run Test

ไม่ต้องมี `.env` สำหรับ unit test

```bash
pnpm --filter @lockgo/api test -- availability.spec.ts pricing.service.spec.ts
```

ครอบคลุม: ช่องว่าง / ช่องทับ / ราคาขั้นต่ำ ฿30 / Medium 4 ชม. = ฿60

Integration / e2e ต้องมี `.env` ที่ชี้โปรเจกต์ที่ migrate + seed แล้ว

```bash
pnpm --filter @lockgo/api test:e2e -- lockers.e2e-spec.ts
pnpm --filter @lockgo/api test:e2e -- reservations.e2e-spec.ts
```

ครอบคลุม: ตัวกรองค้นหา · จองสำเร็จ · เต็มแล้ว 409 · idempotency · Alice/Bob พร้อมกัน · ยกเลิกแล้วจองใหม่

ตรวจหน้าบ้าน

```bash
pnpm --filter @lockgo/web build
```

---

## 9. API Documentation

Swagger UI: http://localhost:3000/api/docs  
ทุกเส้นต้องมี `Authorization: Bearer <access_token>`  
`POST /api/reservations` ต้องมี `Idempotency-Key`

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/lockers/locations` | สถานที่จำลองในกรุงเทพ |
| GET | `/api/lockers` | ค้นหาตู้ ตัวกรอง location, distance, size, price, available_only, start_time, duration |
| GET | `/api/lockers/{id}` | รายละเอียด + Available Time รายขนาด |
| POST | `/api/reservations` | สร้างการจอง |
| GET | `/api/reservations` | ประวัติของตัวเอง |
| GET | `/api/reservations/{id}` | ดูใบจอง เจ้าของเท่านั้น |
| PATCH | `/api/reservations/{id}/cancel` | ยกเลิกใบ Reserved ของตัวเอง |

Error รูปเดียวทั้งระบบ: `{ statusCode, code, message }`

---

## 10. AI Tools

ใช้ Cursor Agent อ่าน Assessment + PRD แล้วลงมือตามบล็อก คนล็อกกฎใน `docs/requirements.md` §25

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
| [docs/design.md](./docs/design.md) | Design token และ UI pattern |
| [docs/erd.md](./docs/erd.md) | ความสัมพันธ์ และเหตุผลที่ user แยกสองตาราง |
| [docs/architecture.md](./docs/architecture.md) | เส้น read / write / realtime |
