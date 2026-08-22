# LockGo — Find & Reserve Locker

> ระบบค้นหาและจองช่อง Smart Locker ล่วงหน้า
> พัฒนาเป็น Technical Assessment ตาม PRD v1.0 — ข้อกำหนดรวมอยู่ที่ [docs/requirements.md](./docs/requirements.md)

**สถานะ:** 🚧 กำลังพัฒนา

---

## 1. Project Overview

_(TBD — ปัญหาที่แก้ ฟีเจอร์ที่ทำ ขอบเขตที่ไม่ทำ)_

**ขอบเขตที่ตั้งใจไม่ทำ:** Payment Gateway จริง · QR/Bluetooth Unlock · Hardware Integration · Push Notification จริง · Google Maps API จริง · Production Deployment — ทั้งหมดอยู่นอก scope ตาม PRD §19

## 2. Architecture

_(TBD — แนบ diagram + อธิบายว่าทำไม read/write เดินผ่าน NestJS ทั้งหมด)_

แผนภาพเต็มอยู่ที่ [docs/architecture.md](./docs/architecture.md)

```
Frontend ──(Supabase Auth SDK)────> Supabase Auth        [Google OAuth / email+password]
Frontend ──(REST + Bearer JWT)────> NestJS ──> Supabase  [read + write ทั้งหมด]
Frontend <─(Supabase Realtime)────  Supabase             [สัญญาณ invalidate cache]
```

## 3. Technology

| ชั้น | เลือกใช้ | เหตุผล |
|------|---------|--------|
| Monorepo | pnpm workspace | _(TBD)_ |
| Frontend | React 19 + Vite + TypeScript | _(TBD)_ |
| Styling | Tailwind CSS | _(TBD)_ |
| Backend | NestJS | _(TBD)_ |
| ORM | Drizzle | _(TBD)_ |
| Database | Supabase Postgres | _(TBD)_ |
| Auth | Supabase Auth | _(TBD)_ |

## 4. Installation

```bash
pnpm install
cp .env.example .env   # แล้วเติมค่าจริง
```

Monorepo: `apps/api` (NestJS) · `apps/web` (Vite + React + Tailwind) · `packages/shared`

## 5. Configuration

ตัวแปรทั้งหมดอยู่ใน [`.env.example`](./.env.example)

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` และ `DATABASE_URL` เป็นค่าฝั่ง server เท่านั้น ห้ามใส่ prefix `VITE_` เด็ดขาด เพราะ Vite จะฝังลง bundle ที่ผู้ใช้เปิดดูได้

## 6. Database Setup

_(TBD — ต้องเขียนสองทาง)_

**ทางที่ 1 — Supabase CLI (แนะนำ)**

```bash
supabase start
pnpm db:migrate
pnpm db:seed
```

**ทางที่ 2 — Supabase project ของคุณเอง**

_(TBD)_

### บัญชีทดสอบ

| อีเมล | รหัสผ่าน | ใช้ทำอะไร |
|-------|----------|-----------|
| _(TBD)_ | | ผู้ใช้หลัก |
| _(TBD)_ | | ทดสอบสิทธิ์เข้าถึงข้ามผู้ใช้ (403) |

### ตั้งค่า Google OAuth (ไม่บังคับ)

ถ้าไม่ตั้ง ยังใช้ email/password ทดสอบได้ครบทุกฟีเจอร์

_(TBD — ขั้นตอน Google Cloud → Supabase)_

## 7. Run Application

```bash
pnpm dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000`

## 8. Run Test

_(TBD)_

## 9. API Documentation

Swagger UI: `http://localhost:3000/api/docs`

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/api/lockers` | ค้นหา locker + filter |
| GET | `/api/lockers/{id}` | รายละเอียด locker |
| POST | `/api/reservations` | สร้างการจอง |
| GET | `/api/reservations/{id}` | ดูการจอง |

## 10. AI Tools ที่ใช้

_(TBD — สร้างตอนบล็อก H ตาม TASKS.md ข้อ 32–35)_

- `docs/ai-workflow.md` — ยังไม่มี จะเขียนตอนบล็อก H
- `docs/ai-prompts.md` — ยังไม่มี จะเขียนตอนบล็อก H
- `docs/ai-code-review.md` — ยังไม่มี จะเขียนตอนบล็อก H
- `docs/debugging-challenge.md` — ยังไม่มี จะเขียนตอนบล็อก H

---

## เอกสารเพิ่มเติม

| ไฟล์ | เนื้อหา |
|------|---------|
| [docs/requirements.md](./docs/requirements.md) | ข้อกำหนดรวมจาก Assessment + PRD และค่าที่ตัดสินแล้ว |
| [docs/design.md](./docs/design.md) | Design token และ UI pattern |
| [docs/erd.md](./docs/erd.md) | ERD ความสัมพันธ์ และเหตุผลที่ user แยกสองตาราง |
| [docs/architecture.md](./docs/architecture.md) | เส้น read / write / realtime |
