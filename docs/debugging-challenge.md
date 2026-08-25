# LockGo — Debugging Challenge

เคสจาก `[A]` §15: ผู้ใช้กด Confirm สองครั้งเร็ว ๆ แล้วได้การจองสองรายการ

## 1. สาเหตุที่เป็นไปได้

| # | สาเหตุ | ชั้น |
|---|--------|------|
| 1 | ปุ่มไม่ `disabled` ตอนส่งคำขอ คลิกสองครั้งยิงสอง HTTP | หน้าบ้าน |
| 2 | สร้าง idempotency key ใหม่ทุกรอบคลิก | หน้าบ้าน |
| 3 | API ไม่บังคับ header / ไม่จำคำขอแรก | หลังบ้าน |
| 4 | กันซ้ำด้วย unique บนผู้ใช้+เวลา แต่คลิกสองครั้งได้คนละช่องขนาดเดียวกัน | ฐานข้อมูล |
| 5 | ตรวจช่องว่างนอกทรานแซกชัน แล้ว INSERT คนละคำขอ | ฐานข้อมูล |

ข้อ 4 และ 5 คือ **จองซ้อนของช่อง** (C-01 / AC-06) ข้อ 1–3 คือ **กดซ้ำของคนเดียวกัน** (S-05 / AC-05) โจทย์ข้อนี้ถามข้อหลัง แต่ระบบต้องกันทั้งสองอย่าง

## 2. ตรวจสอบยังไง

1. เปิด Network แล้วคลิกรัว — ต้องเห็นคำขอที่สองค้างหรือถูกกันที่ปุ่ม
2. ดูว่า header `Idempotency-Key` ของสองคำขอเป็นค่าเดียวกันหรือไม่
3. รันเทสต์ที่มีอยู่

```110:136:apps/api/test/reservations.e2e-spec.ts
  it('returns the same reservation when the idempotency key is reused', async () => {
    // POST สองครั้งด้วย key เดิม → reservation_number และ id เดียวกัน
  });
```

```138:164:apps/api/test/reservations.e2e-spec.ts
  it('returns the same reservation when the same key is sent concurrently', async () => {
    // POST คู่ขนานด้วย key เดิม → 201 ทั้งคู่ และ id เดียวกัน
  });
```

```82:108:apps/api/test/reservations.e2e-spec.ts
  it('lets only one of two concurrent bookings take the last Large slot', async () => {
    // Alice และ Bob พร้อมกัน → 201 + 409
  });
```

4. ถ้ายังสงสัยที่ SQL ให้เรียก `private.create_lockgo_reservation` สองครั้งในทรานแซกชันคนละอัน ช่องเดียวกัน ต้องเจอ `NO_AVAILABILITY` หรือ `23P01`

## 3. แก้ที่ฝั่งไหน

แก้ทั้งคู่ ไม่เลือกฝั่งเดียว

| ชั้น | ทำอะไร | ไม่พอถ้าอยู่ชั้นเดียว |
|------|--------|------------------------|
| หน้าบ้าน | `confirmLock` + `disabled` + `isPending` + `useRef` key ต่อหน้า | ผู้ใช้ช้า / retry / tab สองอันยังยิงซ้ำได้ |
| Nest | `Idempotency-Key` บังคับ จำคำขอสำเร็จ และล็อก `(user, key)` ก่อนสร้าง | ไม่ได้ล็อกช่อง คนละคนยังแย่งใบสุดท้ายได้ |
| Postgres | `SELECT … FOR UPDATE` แล้ว INSERT ภายใต้ `EXCLUDE` | ไม่รู้ว่าคลิกซ้ำกับคนละคน |

## 4. กันไม่ให้เกิดซ้ำ — ของที่ทำจริง

**หน้าบ้าน** — สร้าง key ครั้งเดียวต่อหน้า ไม่สร้างตอนคลิก ตั้ง `confirmLock` ทันทีตอนกด (ก่อน React render) และปิดปุ่มตอนค้าง

```61:62:apps/web/src/pages/ReservePage.tsx
  const idempotencyKey = useRef(crypto.randomUUID())
  const confirmLock = useRef(false)
```

เดสก์ท็อป (การ์ดสรุป) และมือถือ (`ActionBar`) ใช้ `disabled` ชุดเดียวกัน — `mutation.isPending` หรือเวลายังเลือกไม่ได้

```349:355:apps/web/src/pages/ReservePage.tsx
            <button
              type="button"
              className={`${primaryButtonClass} mt-3.5 hidden w-full lg:inline-flex`}
              disabled={disabled}
              onClick={onConfirm}
            >
```

```368:372:apps/web/src/pages/ReservePage.tsx
        <button
          type="button"
          className={compactButtonClass}
          disabled={disabled}
          onClick={onConfirm}
```

**Nest** — บังคับ header แล้วหา `(user_id, key)` ก่อนเข้า service เจอแล้วคืนใบเดิมเป็น 201 ไม่สร้างแถวใหม่ 409 ไม่ถูกเก็บ จึงเปลี่ยนเวลาแล้วยิงใหม่ได้ คำขอคู่ขนานที่ใช้ key เดียวกันถูกล็อกในโปรเซสก่อน lookup เพื่อไม่ให้ทั้งคู่พลาด SELECT แล้วสร้างใบสองใบ

```83:86:apps/api/src/reservations/idempotency.interceptor.ts
    if (existing[0]) {
      response.status(HttpStatus.CREATED);
      return existing[0].responseBody;
    }
```

**Postgres** — หมดอายุที่เลย grace 15 นาทีในทรานแซกชันเดียวกัน แล้วล็อกแถวช่องก่อนเลือกช่องว่าง

```74:88:supabase/migrations/0002_reservation_lock.sql
  UPDATE public.reservations
  SET
    status = 'Expired',
    updated_at = clock_timestamp()
  WHERE status = 'Reserved'
    AND no_show_deadline < clock_timestamp();

  v_end_time := p_start_time + make_interval(hours => p_duration_hours);
  v_deadline := p_start_time + interval '15 minutes';

  PERFORM 1
  FROM public.compartments c
  WHERE c.station_id = p_station_id
    AND c.size = p_size
  FOR UPDATE;
```

Exclusion constraint ยังกันช่วงเวลาทับของสถานะ `Reserved` / `Active` อยู่แม้ฟังก์ชันมีช่องโหว่

ไม่ใช้ unique `(user_id, compartment_id, start_time)` เพราะยกเลิกแล้วจองช่วงเดิมต้องได้ — ดูเทสต์ยกเลิกแล้วให้ Bob จองใบใหม่ใน `reservations.e2e-spec.ts`
