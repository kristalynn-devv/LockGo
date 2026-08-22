# LockGo — AI Prompts

เก็บจากงานจริง ไม่ใช่ prompt ที่แต่งตอนส่ง ทุกอันชี้ไปที่ไฟล์ที่ได้

## 1. Requirement analysis — ล็อกเอกสารก่อนลงมือ

**ใช้ทำอะไร:** เทียบ Technical Assessment กับ PRD แล้วเขียน `docs/requirements.md` ให้เหลือค่านิยามเดียว

**Prompt ที่ใช้ (ย่อจากงานจริง):**

```
ล็อกเอกสารและแผนงานให้ตรงกัน
เทียบ Word ต้นทางสองไฟล์นี้กับ requirements
c:\Users\krist\Downloads\AI Fullstack Engineer - Technical Assessment.docx
c:\Users\krist\Downloads\_LOCKGO PRD.docx
ห้ามเหลือช่องตัดสินใจ ปิด C / U / I / T / S ใน §25
```

**ทำไมถึงได้ผล:** บังคับให้อ่านเอกสารต้นทาง ไม่ให้เดาจาก NOTES ที่เลิกใช้แล้ว

**คนแก้หลัง AI ร่าง:** ย้ายข้อสรุปไป `docs/requirements.md` อย่างเดียว เลิกใช้ `ASSUMPTIONS.md` / `NOTES.md` เป็นแหล่งลงมือ และล็อกว่าจองล่วงหน้า 7 วัน ไม่ใช่ 1 วันตามร่างเก่า

**ผลลัพธ์:** [requirements.md](./requirements.md) §25 · commit `f199940`

---

## 2. Generate lock SQL — กันจองซ้อนที่ฐานข้อมูลก่อนมี API

**ใช้ทำอะไร:** สร้างชั้นที่คะแนน Database & Business Logic ต้องการก่อนเขียน Nest

**Prompt ที่ใช้:**

```
ทำบล็อก B ตาม TASKS
Drizzle schema ตาม ERD
ห้าม drizzle-kit push
migration มือ: trigger auth.users → public.users
private.create_lockgo_reservation ต้อง FOR UPDATE แล้ว sweep
รายการที่เลย no_show_deadline เป็น Expired ก่อนตรวจช่องว่าง
btree_gist + EXCLUDE USING gist ที่ระดับช่อง
seed 5 สถานีกรุงเทพ + Alice/Bob
พิสูจน์ด้วย SQL: NO_AVAILABILITY, 23P01, Medium 4 ชม. = ฿60
```

**ทำไมถึงได้ผล:** ใส่ค่าที่ล็อกแล้ว (C-01, C-07, U-01, S-04, S-08) ใน prompt เลย AI จะได้ไม่ไปสร้าง unique บนผู้ใช้

**คนแก้หลัง AI ร่าง:** ย้าย `btree_gist` ไป schema `extensions` ตาม advisor ของ Supabase และให้ฟังก์ชัน `GRANT` เฉพาะ `postgres` / `service_role`

**ผลลัพธ์:** [0002_reservation_lock.sql](../supabase/migrations/0002_reservation_lock.sql) · commit `5fc65e8`

---

## 3. Generate concurrency test — พิสูจน์ AC-05 / AC-06 ก่อนทำ UI

**ใช้ทำอะไร:** ถ้ากันซ้ำยังไม่ผ่าน แปลว่าออกแบบ DB ผิด แก้ตอนนี้ถูกกว่าแก้หลังมีหน้าจอ

**Prompt ที่ใช้:**

```
เขียน e2e ด้วย Alice และ Bob
Promise.all จอง Large ช่องสุดท้ายที่ Mo Chit พร้อมกัน
ต้องได้ 201 + 409
ยิง Idempotency-Key เดิมแล้วได้ reservation เดิม
เติมช่องแล้วยิงอีกคนต้อง 409 NO_AVAILABILITY
อย่าใช้ชั่วโมงที่ทับกับเทสต์อื่น
afterAll ต้อง closeDb
```

**ทำไมถึงได้ผล:** ระบุชื่อสถานี ขนาด และรหัส error ที่สัญญา API ใช้แล้ว ไม่ให้เทสต์ไป assert ข้อความอิสระ

**คนแก้หลัง AI ร่าง:** เลื่อน `futureHour` ไปช่อง 30/36/40/52… เพื่อไม่ชนข้อมูลที่ค้างจากรันก่อนหน้า

**ผลลัพธ์:** [reservations.e2e-spec.ts](../apps/api/test/reservations.e2e-spec.ts) · commit `fd3ec18`

---

## 4. Generate UI — เดิน journey ทับ API ที่นิ่ง

**ใช้ทำอะไร:** บล็อก F หลังบ้านปิดแล้ว หน้าบ้านต้องเรียกของจริง ไม่ mock

**Prompt ที่ใช้:**

```
ทำบล็อก F ตาม docs/design.md
React Router + TanStack Query + supabase-js
Vite อ่าน VITE_* จาก .env ที่ราก repo
Find มี dropdown สถานที่จำลอง I-04 และตัวกรองราคา
Detail มี Available Time รายขนาด
Reserve: วัน/เวลา/1–24 ชม./7 วัน + แยกเรทกับยอดรวม
Confirm disabled ตอน isPending และส่ง Idempotency-Key
409 ต้องอยู่หน้า reserve ไม่เด้งหน้าแรก
History + ยกเลิก Reserved
Realtime reservations → invalidateQueries
ทุกหน้ามี loading / empty / error
ห้ามโชว์ข้อความดิบจากเซิร์ฟเวอร์
```

**ทำไมถึงได้ผล:** ชี้ design tokens และเคส 409 โดยตรง กัน UI ที่สวยแต่กดซ้ำแล้วสร้างสองใบ

**คนแก้หลัง AI ร่าง:** `available_only` ฝั่ง API ต้องแปลง `'true'`/`'1'` เอง ห้าม `Boolean("false")` และ Vite ต้องตั้ง `envDir` ไปที่ราก repo

**ผลลัพธ์:** `apps/web/src/pages/*` · commit `b7f8505`
