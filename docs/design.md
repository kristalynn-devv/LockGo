# LockGo — UI Design Spec

แหล่งของจริง: [apps/web/src/index.css](../apps/web/src/index.css) · [apps/web/src/ui/Page.tsx](../apps/web/src/ui/Page.tsx)  
กฎผลิตภัณฑ์ที่ห้ามเปลี่ยนเงียบ ๆ อยู่ที่ [requirements.md](./requirements.md) §19 · §25

**แนวทาง:** สะอาด มืออาชีพ · Tailwind v4 + token ใน `index.css` · ไม่มี component library

อย่าไล่แก้ spacing / สี / ขนาดปุ่มทีละหน้า — ใช้ class ร่วมใน `Page.tsx` แล้วค่อย override จุดที่สเปกนี้ระบุต่างกัน (เช่น แถบล่างมือถือ)

---

## 1. Design Tokens

สีเป็น CSS variables ใน `:root` และ `[data-theme="dark"]` แล้ว map เป็น utility ผ่าน `@theme inline` สลับธีมด้วย `data-theme` บน `<html>` (`ThemeProvider`) ไม่เขียน `dark:` ซ้ำทุกจุด

### สี (บทบาท → class)

| บทบาท | class | ใช้ที่ไหน |
|-------|-------|-----------|
| พื้นหลังหน้า | `bg-canvas` | `<body>` |
| พื้นหลังการ์ด | `bg-surface` | card, panel, header |
| พื้นยก / hover | `bg-elevated` | แถวที่กดได้, ชิปปิด |
| เส้นขอบ | `border-line` · `border-line-strong` | การ์ด / ช่องกรอก |
| ตัวอักษรหลัก | `text-ink` | หัวข้อ ตัวเลขสำคัญ |
| ตัวอักษรรอง | `text-ink-muted` | คำอธิบาย |
| ตัวอักษรจาง | `text-ink-faint` | placeholder, meta |
| **Primary** | `bg-accent` · `text-accent-ink` | ปุ่มหลัก |
| Primary hover | `bg-accent-hover` | |
| ข้อความลิงก์ / active | `text-accent-text` · `bg-accent-soft` | ลิงก์, ชิปที่เลือก, Reserved |
| สำเร็จ / ว่าง | `text-ok` · `bg-ok-soft` | ช่องว่าง, Open |
| เตือน / เหลือน้อย | `text-warn` · `bg-warn-soft` | ว่าง 1–2, Maintenance |
| ผิดพลาด / เต็ม | `text-danger` · `bg-danger-soft` | เต็ม, Expired, error |

โทน indigo ของ accent ไม่เปลี่ยนเป็นสีที่หก — ok / warn / danger เป็นคู่สถานะตามตารางนี้

### ตัวอักษร

ฟอนต์อยู่ที่ `@theme` ใน `index.css` ไม่มี `tailwind.config.js`

```
Inter, "Noto Sans Thai", system-ui, sans-serif
```

| ระดับ | class ในโค้ด |
|-------|----------------|
| หัวข้อหน้า | `pageTitleClass` → `text-2xl font-semibold text-ink` |
| หัวข้อการ์ด | `cardTitleClass` → `text-lg font-semibold text-ink` |
| เนื้อความ | `text-sm text-ink-muted` |
| label | `labelClass` → `text-xs font-medium uppercase tracking-wide text-ink-muted` |
| ราคา (เด่น) | `priceClass` → `text-xl font-bold tabular-nums text-ink` |

### ระยะและมุม

| อย่าง | ค่า |
|------|-----|
| ความกว้างหน้า wide | `max-w-7xl` · padding `px-4 sm:px-6 lg:px-8` · `py-4 sm:py-6 lg:py-8` |
| หน้าแคบ (ยืนยัน / ฟอร์ม) | `max-w-3xl` |
| กริดการ์ดรายการ | `grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3` |
| padding ในการ์ด | `p-4` |
| มุมโค้ง | `rounded-lg` (การ์ด, ปุ่ม, input) · `rounded-full` (badge, ชิป) |
| เงาการ์ด | `shadow-sm` |

---

## 2. Component Patterns

แหล่งคัดลอก: export ใน `Page.tsx` (`cardClass`, `primaryButtonClass`, `fieldClass`, …)

### ปุ่ม

```jsx
// หลัก — ฟอร์ม / การ์ดสรุปเดสก์ท็อป (min-h-11)
primaryButtonClass + " w-full"

// รอง
secondaryButtonClass

// แถบล่างมือถือ — แถวเดียวกับราคา ไม่เต็มความกว้าง
compactButtonClass  // h-9 shrink-0
```

ปุ่ม Confirm **ต้อง `disabled`** และผูกกับ `mutation.isPending` (และเงื่อนไขเวลาว่าง) — ด่านกันกดซ้ำฝั่ง frontend ตาม S-05  
มือถือใช้ข้อความสั้น `ยืนยัน` / `เลือก` · เดสก์ท็อปใช้ `ยืนยันการจอง` / `เลือกขนาดนี้`

### การ์ด

```jsx
cardClass          // rounded-lg border-line bg-surface shadow-sm
cardClass + cardHitClass  // ทั้งใบเป็นเป้า + hover ขอบ accent
```

CTA มุมขวาล่างของการ์ดรายการใช้ `cardCtaClass` ภายใน `<Link>` ไม่ซ้อน `<button>`

### Input / Select

`fieldClass` — `min-h-11` · `rounded-lg` · focus `border-accent` + `ring-1 ring-accent`  
ตัวกรองแบบเมนูใช้ `MenuSelect` variant `pill` (สูง `h-8`) หรือ `field`

### Badge สถานะ

```jsx
inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
```

โทนจาก `statusTone` / `availabilityTone` ใน `format.ts`

| สถานะ | โทน |
|-------|-----|
| Open / Active / ว่าง ≥ 3 | `bg-ok-soft text-ok` |
| Reserved ที่ยังไม่จ่าย (ป้ายรอชำระ) / Maintenance / ว่าง 1–2 | `bg-warn-soft text-warn` |
| Closed / Completed / Cancelled | `bg-elevated text-ink-muted` |
| เต็ม (นับ 0) / Expired | `bg-danger-soft text-danger` |
| Reserved | `bg-accent-soft text-accent-text` |

### ตัวเลขช่องว่างรายขนาด

หน้า list ต้องโชว์แยก S/M/L (C-02 · AC-10) และมีคำกำกับ **"ว่างตอนนี้"** หรือ **"ว่างช่วงที่เลือก"** ตาม U-06

```jsx
{SIZES.map((size) => (
  <Badge key={size} tone={availabilityTone(item.available[size])}>
    {`${shortSize(size)} ${item.available[size]}`}
  </Badge>
))}
```

### สาม state ที่ทุกหน้าต้องมี

Loading — `Skeleton` / `SkeletonList` (โครงการ์ด + shimmer)  
Empty — เส้นประ `border-dashed` + ปุ่มทางออก (`ล้างทั้งหมด` / `ขยายเป็น 5 km`)  
Error — การ์ด `border-danger` + `ลองใหม่` ไม่โชว์ข้อความดิบจากเซิร์ฟเวอร์

---

## 3. โครงหน้าจอ

### Screen 1 — Find Locker

```
┌────────────────────────────────────────┐
│ LockGo          [ธีม] [โปรไฟล์]        │  header sticky · แท็บ md+
├────────────────────────────────────────┤
│ [ ค้นหาสถานี…          ][ใกล้ฉัน]     │
│ ตัวกรอง ▾              ล้างทั้งหมด     │  ชิปซ่อนจนกดขยาย
│ [ระยะ][ขนาด][ราคา][เรียง][ว่างเท่านั้น]│
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │ LockGo Central Station    [เปิด]   │ │
│ │ 350 m · ที่อยู่                    │ │
│ │ ว่างตอนนี้                         │ │
│ │ [S 8] [M 4] [L 2]                  │ │
│ │ เริ่มต้น ฿30              [เลือก →]│ │
│ └────────────────────────────────────┘ │
│ แท็บ ค้นหา / รอชำระ / ใช้งาน / ประวัติ │
└────────────────────────────────────────┘
```

ตัวกรองเริ่มหุบ — ความหมายชิปไม่เปลี่ยน (ราคา = เพดานราคาเริ่มต้น ตาม AC-08)  
ช่องค้นหาอยู่บนสุดตามโครงหน้า Find · ถ้ามีใบรอชำระหรือของในตู้ แบนเนอร์อยู่ใต้ช่องค้นหา — 1 ใบเปิดใบนั้น · หลายใบไปประวัติที่กรองแล้ว (`/history?status=`)

### Screen 2 — Locker Detail

มือถือซ้อนกัน · `lg:` สองคอลัมน์ (เนื้อหา 8 / แถบขนาด 4)  
ชื่อ + badge สถานะ → ที่อยู่ → เปิด 24 ชั่วโมง → ช่วงว่างรายวันของขนาดที่เลือก  
แถบขวา: ปุ่มขนาด (ว่าง 0 และไม่มีช่วงใน 7 วัน = `opacity-50 pointer-events-none`) · เรทต่อชม. · ปุ่ม `เลือกขนาดนี้`  
มือถือ: `ActionBar` ราคาซ้าย ปุ่ม `เลือก` ขวา

### Screen 3 — Reservation

```
สรุปตู้ที่เลือก        ← การ์ดอ่านอย่างเดียว bg-elevated
เลือกขนาด             ← ปุ่ม 3 อัน อันที่เลือก ring-2 ring-accent
ระยะเวลา / วันที่ / เวลาเริ่ม
─────────────────────
ราคา       ฿15 × 4 ชม.
รวม              ฿60   ← priceClass
[ ยืนยันการจอง ]       ← เดสก์ท็อปในการ์ดสรุป · disabled ตอน isPending
```

มือถือ: แถบล่างราคา + ปุ่มกะทัดรัด `ยืนยัน`  
ต้องแยก **ราคา** กับ **ราคารวม** (C-09) · ขั้นต่ำ ฿30 แสดงเมื่อ `rate × ชม. < 30`  
409 อยู่ที่หน้านี้ ไม่เด้งกลับหน้าแรก

### Screen 4 — Confirmation

ไอคอนสำเร็จ (ok) → หมายเลข `text-2xl font-bold tracking-wider` → แถว `flex justify-between`  
ฟิลด์: ตู้ · ที่อยู่ · ช่อง · เริ่ม · สิ้นสุด · เข้าใช้ภายใน · ราคา · ราคารวม · สถานะ  
สถานะเป็น Badge ใต้หมายเลข และแถวในรายการ — Reserved ที่ยังไม่จ่ายเขียน **รอชำระ**  
ปุ่ม `กลับหน้าแรก` / `ดูประวัติ`

การ์ดชำระ (`PayCard`) อยู่**บนสุด**เมื่อยังไม่จ่าย — ปุ่มไปหน้า `/reservations/:id/pay` กรอกฟอร์มชำระ · **ไม่แสดง QR**
หลังจ่าย แผงตั๋ว (`AccessTicket`) อยู่**บนสุดแทนช่องชำระ** · QR บนพื้นขาว + หมายเลขจอง + รหัส 6 หลัก · กด QR แล้วขยายเต็มจอ
จองสำเร็จอยู่บนสุดของหน้า · สลับแท็บเลื่อนกลับบนสุด

### หน้าจ่าย — `/reservations/:id/pay`

ฟอร์มชำระ: เลือกพร้อมเพย์ / บัตร / โอน แล้วกรอกตามวิธี  
พร้อมเพย์มี QR จำลอง · โอนโชว์บัญชีทดสอบ · บัตรกรอกชื่อ เลข หมดอายุ CVC ที่เครื่องอย่างเดียว  
ส่งแค่ `method` ผ่าน PATCH `/api/reservations/{id}/pay` · Nest เรียก `private.pay_lockgo_reservation` · ไม่เก็บเลขบัตร ไม่ตัดเงินเกตเวย์จริง (§20)

### ประวัติ

ป้ายบนการ์ดโชว์สถานะจริงของใบนั้น  
แท็บประวัติแสดงเฉพาะใบย้อนหลัง · เสร็จแล้ว / ยกเลิกแล้ว / หมดอายุ — ไม่ปนใบรอชำระหรือใช้งาน  
ชิปกรองหน้าประวัติมี **3** สถานะย้อนหลัง · เสร็จแล้ว / ยกเลิกแล้ว / หมดอายุ · **ล้างตัวกรอง** ต่อท้ายแถวชิปเมื่อเลือกแล้ว  
แท็บรอชำระ / ใช้งานไม่มีชิปและไม่มีล้างตัวกรอง — ไม่ใช่ตัวกรองของหน้าประวัติ  
แท็บใช้งานรวมใบ Reserved ที่จ่ายแล้ว (ยังไม่ฝาก) กับ Active — สถานะจริงไม่เปลี่ยน  
ปุ่ม **ชำระเงิน ฿…** ไปหน้ากรอกฟอร์มชำระ แล้วฟังก์ชันบน Supabase เขียน transaction  
ปุ่ม **ดู QR เปิดตู้ / รับของ** เต็มความกว้างไปหน้าใบจอง · ปุ่ม **ยกเลิก** แยกจากเป้าลิงก์ (I-02 · P-01)

---

## 4. Responsive (C-06)

mobile-first แล้วเติม `md` / `lg` / `xl`

| จุด | มือถือ (~375px) | จอใหญ่ |
|-----|-----------------|--------|
| นำทาง | TabBar ค้นหา / รอชำระ / ใช้งาน / ประวัติ · จุดตัวเลขบนรอชำระ (`bg-warn`) และใช้งาน (`bg-ok`) เมื่อมีใบ | ลิงก์ชุดเดียวกันใน header |
| ตัวกรองค้นหา | หุบหลังปุ่มตัวกรอง แล้ว `flex-wrap` | เหมือนกัน |
| การ์ด locker | 1 คอลัมน์ | 2 ที่ `md` · 3 ที่ `xl` |
| จอง / รายละเอียด | ActionBar กะทัดรัด | ปุ่มเต็มความกว้างในการ์ดขวา (`lg:`) |
| ปุ่มหลักในฟอร์มล็อกอิน / ยืนยัน | `w-full` | `w-full` ในกริด 2 คอลัมน์ |

ทดสอบที่ 375px และ 1280px

---

## 5. Checklist ก่อนปิดงาน Frontend

| รายการ | |
|--------|---|
| ทุกหน้ามี loading / empty / error state | ใช้ `Skeleton` · Empty เส้นประ · Error การ์ด danger |
| ปุ่ม Confirm disabled ตอน submit | `disabled={disabled}` รวม `isPending` |
| 409 แสดงที่หน้าจอง แล้วให้เลือกใหม่ | `NoticeCard` ไม่เด้งหน้าแรก |
| ช่องว่าง 0 กดไม่ได้ | `pointer-events-none opacity-50` |
| ไม่มีข้อความ error ดิบจาก server | `authErrorMessage` / ข้อความคงที่ |
| ทดสอบที่ 375px แล้วไม่มีอะไรล้น | ActionBar แถวเดียว |
| สีตาม token ใน `index.css` | light + dark |
