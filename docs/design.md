# LockGo — UI Design Spec

**แนวทาง:** สะอาด มืออาชีพ · Tailwind ล้วน ไม่มี component library · ระดับ "ใช้งานได้ดี" ไม่ใช่ "ขัดเงา"

**กฎเหล็กสำหรับกรอบเวลา 48 ชม.**

| ห้าม | ทำแทน |
|------|-------|
| เขียนไฟล์ `.css` เพิ่ม (ยกเว้น `index.css` ที่มี `@tailwind`) | ใช้ utility class อย่างเดียว |
| animation / transition ที่ไม่ใช่ hover | `transition-colors` พอ |
| ทำ dark mode | โหมดสว่างอย่างเดียว |
| หา icon library | ใช้ emoji หรือ inline SVG เท่าที่จำเป็น |
| ปรับ spacing ทีละหน้า | ใช้ scale ในเอกสารนี้ทุกหน้า |

---

## 1. Design Tokens

### สี

| บทบาท | Tailwind | ใช้ที่ไหน |
|-------|----------|-----------|
| พื้นหลังหน้า | `bg-slate-50` | `<body>` |
| พื้นหลังการ์ด | `bg-white` | card, panel, modal |
| เส้นขอบ | `border-slate-200` | ทุกเส้นขอบ |
| ตัวอักษรหลัก | `text-slate-900` | หัวข้อ ตัวเลขสำคัญ |
| ตัวอักษรรอง | `text-slate-600` | คำอธิบาย label |
| ตัวอักษรจาง | `text-slate-400` | placeholder, meta |
| **Primary** | `indigo-600` | ปุ่มหลัก ลิงก์ สถานะ active |
| Primary hover | `indigo-700` | |
| สำเร็จ / ว่าง | `emerald-600` · พื้น `emerald-50` | ช่องว่าง, Active |
| เตือน / เหลือน้อย | `amber-600` · พื้น `amber-50` | ว่าง 1-2 ช่อง, Maintenance |
| ผิดพลาด / เต็ม | `rose-600` · พื้น `rose-50` | เต็ม, Expired, error |

> ใช้แค่ 5 สีนี้ทั้งแอป อย่าเพิ่มสีที่หก

### ตัวอักษร

```js
// tailwind.config.js
fontFamily: {
  sans: ['Inter', 'Noto Sans Thai', 'system-ui', 'sans-serif'],
}
```

| ระดับ | class |
|-------|-------|
| หัวข้อหน้า | `text-2xl font-semibold text-slate-900` |
| หัวข้อการ์ด | `text-lg font-semibold text-slate-900` |
| เนื้อความ | `text-sm text-slate-600` |
| label | `text-xs font-medium text-slate-500 uppercase tracking-wide` |
| ราคา (เด่น) | `text-xl font-bold text-slate-900` |

### ระยะและมุม

| อย่าง | ค่า |
|------|-----|
| ความกว้างสูงสุด | `max-w-3xl mx-auto` (list) · `max-w-xl` (form) |
| ขอบหน้าจอ | `px-4 py-6 sm:px-6` |
| ช่องไฟระหว่างการ์ด | `space-y-3` |
| padding ในการ์ด | `p-4` |
| มุมโค้ง | `rounded-lg` (การ์ด, input) · `rounded-full` (badge) |
| เงา | `shadow-sm` เท่านั้น — ห้ามใช้ `shadow-lg` |

---

## 2. Component Patterns (คัดลอกไปใช้ได้เลย)

### ปุ่ม

```jsx
// หลัก
className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white
           transition-colors hover:bg-indigo-700
           disabled:cursor-not-allowed disabled:bg-slate-300"

// รอง
className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm
           font-medium text-slate-700 transition-colors hover:bg-slate-50"
```

> ⭐ ปุ่ม Confirm Reservation **ต้องมี `disabled:`** และผูกกับ `isPending` ของ mutation — นี่คือด่านกันกดซ้ำฝั่ง frontend

### การ์ด

```jsx
className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
// แบบกดได้
className="... transition-colors hover:border-indigo-300 hover:bg-slate-50 cursor-pointer"
```

### Input / Select

```jsx
className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
           focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
```

### Badge สถานะ

```jsx
const badge = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
```

| สถานะ | class เพิ่ม |
|-------|------------|
| Open / Active / ว่าง | `bg-emerald-50 text-emerald-700` |
| Maintenance / เหลือน้อย | `bg-amber-50 text-amber-700` |
| Closed / Completed / Cancelled | `bg-slate-100 text-slate-600` |
| เต็ม / Expired | `bg-rose-50 text-rose-700` |
| Reserved | `bg-indigo-50 text-indigo-700` |

### ตัวเลขช่องว่างรายขนาด

หน้า list ต้องโชว์แยก S/M/L (ข้อบังคับ `[A]` §3)

```jsx
<div className="flex gap-2">
  {sizes.map(s => (
    <span key={s.size} className={`${badge} ${s.count === 0 ? 'bg-rose-50 text-rose-700'
      : s.count <= 2 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
      {s.size} {s.count}
    </span>
  ))}
</div>
```

### สาม state ที่ทุกหน้าต้องมี

```jsx
// Loading — skeleton แบบถูกที่สุด
<div className="h-24 animate-pulse rounded-lg bg-slate-100" />

// Empty
<div className="rounded-lg border border-dashed border-slate-300 p-8 text-center">
  <p className="text-sm text-slate-600">ไม่พบ Locker ที่ตรงกับเงื่อนไข</p>
  <button className="mt-3 text-sm font-medium text-indigo-600">ล้างตัวกรอง</button>
</div>

// Error
<div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
  <p className="text-sm text-rose-700">{message}</p>
  <button className="mt-2 text-sm font-medium text-rose-700 underline">ลองใหม่</button>
</div>
```

---

## 3. โครงหน้าจอ

### Screen 1 — Find Locker

```
┌────────────────────────────────────────┐
│ LockGo                    [โปรไฟล์ ▾]  │  header: border-b bg-white
├────────────────────────────────────────┤
│ [ 🔍 ค้นหาสถานที่........... ]          │
│ [ระยะทาง ▾][ขนาด ▾][ราคา ▾][ว่าง ▾]   │  filter: flex gap-2 overflow-x-auto
├────────────────────────────────────────┤
│ ┌────────────────────────────────────┐ │
│ │ LockGo Central Station    [เปิด]   │ │
│ │ 350 m · ถ.พระราม 4                │ │
│ │ [S 8] [M 4] [L 2]                  │ │
│ │ เริ่มต้น ฿30              [เลือก →]│ │
│ └────────────────────────────────────┘ │
└────────────────────────────────────────┘
```

ตัวเลขช่องว่างต้องมีคำกำกับว่า **"ว่างตอนนี้"** (ตาม U-06) เพราะยังไม่ได้เลือกเวลา

### Screen 2 — Locker Detail

การ์ดเดียวเรียงลงมา: ชื่อ+badge สถานะ → ที่อยู่+ระยะทาง → เวลาทำการ → ตารางขนาด (ขนาด / ว่าง / ราคาต่อชม.) แต่ละแถวกดเลือกได้ → ปุ่มหลักล่างสุด

ขนาดที่ว่าง 0 → `opacity-50 pointer-events-none`

### Screen 3 — Reservation

```
สรุปตู้ที่เลือก        ← การ์ดอ่านอย่างเดียว bg-slate-50
เลือกขนาด             ← ปุ่ม 3 อัน อันที่เลือก ring-2 ring-indigo-600
วันที่ / เวลาเริ่ม      ← input date + time
ระยะเวลา              ← select ชั่วโมง
─────────────────────
ราคา       ฿15 × 4 ชม.
รวม              ฿60   ← text-xl font-bold
─────────────────────
[ ยืนยันการจอง ]       ← disabled ตอน isPending
```

ต้องแยก **ราคา** กับ **ราคารวม** ให้เห็นที่มา (C-09)

### Screen 4 — Confirmation

ไอคอนสำเร็จ (emerald) → หมายเลขการจองตัวใหญ่ `text-2xl font-bold tracking-wider` → รายการฟิลด์แบบ `flex justify-between` (สถานี / ที่อยู่ / ขนาด / เริ่ม / สิ้นสุด / ราคา / สถานะ) → ปุ่มกลับหน้าแรก

ต้องครบทุกฟิลด์ตาม `[A]` §5 Screen 4 + Price ตาม `[P]` §12

---

## 4. Responsive (Bonus 1)

ออกแบบ mobile-first แล้วเติม breakpoint เดียวพอ

| จุด | มือถือ | `sm:` ขึ้นไป |
|-----|--------|-------------|
| ตัวกรอง | เลื่อนแนวนอน `overflow-x-auto` | `flex-wrap` |
| การ์ด locker | เรียงลง | เหมือนเดิม (max-w จำกัดอยู่แล้ว) |
| ปุ่มหลัก | `w-full` | `w-auto` ในฟอร์ม |

ทดสอบที่ 375px และ 1280px แค่สองขนาด

---

## 5. Checklist ก่อนปิดงาน Frontend

| รายการ | ✅ |
|--------|---|
| ทุกหน้ามี loading / empty / error state | ☐ |
| ปุ่ม Confirm disabled ตอน submit | ☐ |
| 409 (มีคนจองตัดหน้า) แสดงข้อความแล้วให้เลือกใหม่ ไม่เด้งกลับหน้าแรก | ☐ |
| ช่องว่าง 0 กดไม่ได้ ไม่ใช่กดได้แล้วค่อย error | ☐ |
| ไม่มีข้อความ error ดิบจาก server โผล่บนหน้าจอ | ☐ |
| ทดสอบที่ 375px แล้วไม่มีอะไรล้น | ☐ |
| ใช้สีแค่ 5 สีตามตาราง | ☐ |
