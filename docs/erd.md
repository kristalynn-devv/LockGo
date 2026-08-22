# LockGo — ERD

แหล่งอ้างอิง: [requirements.md](./requirements.md) §17 · §25 (T-02, S-04, S-05, S-06, C-03, C-09)

Assessment บังคับอย่างน้อย 4 entity: User · Locker · Compartment · Reservation  
รอบนี้เพิ่ม `station_pricing` (เรทรายสถานี) และ `idempotency_keys` (กันกด Confirm ซ้ำ) ตามที่ล็อกไว้แล้ว ไม่เพิ่มตารางนอกนั้น

```mermaid
erDiagram
  AUTH_USERS ||--|| USERS : "1:1 sync trigger"
  USERS ||--o{ RESERVATIONS : "owns"
  LOCKER_STATIONS ||--|{ COMPARTMENTS : "has"
  LOCKER_STATIONS ||--|{ STATION_PRICING : "rates"
  COMPARTMENTS ||--o{ RESERVATIONS : "booked as"
  USERS ||--o{ IDEMPOTENCY_KEYS : "confirm keys"
  RESERVATIONS ||--o| IDEMPOTENCY_KEYS : "first success"

  AUTH_USERS {
    uuid id PK
    text email
    jsonb raw_user_meta_data
  }

  USERS {
    uuid id PK_FK
    text display_name
    text avatar_url
    timestamptz created_at
    timestamptz updated_at
  }

  LOCKER_STATIONS {
    uuid id PK
    text name
    text address
    numeric latitude
    numeric longitude
    text status
    timestamptz created_at
  }

  COMPARTMENTS {
    uuid id PK
    uuid station_id FK
    text size
    text label
    timestamptz created_at
  }

  STATION_PRICING {
    uuid station_id PK_FK
    text size PK
    numeric rate_per_hour
  }

  RESERVATIONS {
    uuid id PK
    text reservation_number UK
    uuid user_id FK
    uuid compartment_id FK
    timestamptz start_time
    timestamptz end_time
    timestamptz no_show_deadline
    text status
    numeric unit_price
    int duration_hours
    numeric total_price
    timestamptz created_at
    timestamptz updated_at
  }

  IDEMPOTENCY_KEYS {
    uuid id PK
    uuid user_id FK
    text key UK_with_user
    uuid reservation_id FK
    jsonb response_body
    timestamptz created_at
  }
```

## ความสัมพันธ์

| จาก | ไป | แบบ | ทำไม |
|-----|-----|-----|------|
| `auth.users` | `public.users` | 1:1 | โปรไฟล์ที่แอปอ่าน/เขียน อยู่ฝั่งเรา Auth อยู่ฝั่ง Supabase — S-06 |
| `locker_stations` | `compartments` | 1:N | ตู้หนึ่งมีหลายช่อง ขนาดคนละแบบ — T-02 |
| `locker_stations` | `station_pricing` | 1:N ตามขนาด | เรทไม่รวมในตู้ เพราะแต่ละสถานีตั้งคนละราคา |
| `compartments` | `reservations` | 1:N | จองผูกช่องเจาะจง ไม่ใช่โควตาต่อขนาด — C-01 · P-02 |
| `users` | `reservations` | 1:N | ประวัติและสิทธิ์เจ้าของ — C-04 · BR-09 |
| `users` + key | `idempotency_keys` | 1:N | คนละปัญหากับจองซ้อน — S-05 |

`AUTH_USERS` ในภาพคือตารางของ Supabase ไม่สร้างเอง

## ทำไม user แยกสองตาราง (S-06)

`auth.users` เป็นของ Auth — เก็บ credential, identity, session  
`public.users` เป็นของโดเมน LockGo — เก็บชื่อ รูป และเป็น FK ของการจอง

แยกเพราะ:

1. Nest อ่าน/เขียนโปรไฟล์ผ่าน schema ของเรา โดยไม่ให้ web แตะ Auth schema
2. Trigger คัดลอก `display_name` / `avatar_url` จาก metadata ตอนสมัคร แอปไม่ต้องสร้างแถวโปรไฟล์เอง
3. ลบหรือย้ายผู้ใช้ฝั่ง Auth ไม่ทำให้ FK การจองชี้ตารางที่แอปไม่ควรถือ
4. RLS และสิทธิ์เจ้าของผูก `public.users.id` ซึ่งเท่ากับ `auth.uid()`

ห้ามใช้ `user_metadata` ใน JWT เป็นแหล่งตัดสินสิทธิ์ — metadata ผู้ใช้แก้ได้

## ข้อจำกัดที่ต้องอยู่ใน schema (ทำตอนบล็อก B)

| ข้อ | ที่ | กติกา |
|-----|-----|--------|
| กันจองซ้อนชั้น 1 | `create_lockgo_reservation` | `SELECT … FOR UPDATE` แล้ว sweep รายการที่เลย `no_show_deadline` เป็น Expired ก่อนหาช่องว่าง |
| กันจองซ้อนชั้น 2 | `reservations` | `EXCLUDE USING gist` ช่วงเวลาทับกันบนช่องเดียวกัน เมื่อ `status IN ('Reserved', 'Active')` |
| หมายเลขจอง | `reservation_number` | unique เช่น `LK-20260813-000123` |
| กันกดซ้ำ | `idempotency_keys` | unique `(user_id, key)` — ห้าม unique `(user_id, compartment_id, start_time)` เพราะยกเลิกแล้วจองใหม่ได้ |
| ราคา | `reservations` | เก็บ `unit_price`, `duration_hours`, `total_price` ตาม C-09 · สูตร `max(rate × hours, 30)` |
| หมดอายุ | `no_show_deadline` | `start_time + 15 นาที` แยกจาก `end_time` |

สถานะใน enum: `Reserved` · `Active` · `Completed` · `Cancelled` · `Expired`  
รอบนี้เปลี่ยนจริงแค่ Reserved / Expired / Cancelled (`P-02`)

ขนาดช่อง: `Small` · `Medium` · `Large`  
สถานะตู้: `Open` · `Maintenance` · `Closed` — ตู้ที่ไม่ Open ไม่โผล่ในค้นหาและจองไม่ได้ (`BR-08`)

ทุกสถานีเปิด 24 ชั่วโมง ไม่มีคอลัมน์เวลาทำการในรอบนี้ (`U-04`)

## สิ่งที่ไม่เป็นตาราง

| ของ | เก็บที่ไหน |
|-----|-----------|
| จุดค้นหาจำลอง (Bangkok seed) | dropdown ฝั่ง web + พิกัดใน seed — I-04 |
| Google / email identity | `auth.users` + provider ของ Supabase Auth |
| Realtime | subscription บน `reservations` ไม่ใช่ตารางใหม่ |

ยังไม่สร้างตารางใน `public` — ว่างอยู่จนบล็อก B
