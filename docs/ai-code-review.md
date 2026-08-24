# LockGo — AI Code Review

ตรวจ 5 ด้านตาม `[A]`: ความถูกต้อง · บั๊ก · ความปลอดภัย · ประสิทธิภาพ · การดูแลรักษา

| เคส | ส่วนที่ตรวจ | ขนาด |
|-----|-------------|------|
| [1](#เคสที่-1--กันกด-confirm-ซ้ำ) | `IdempotencyInterceptor` — กันกด Confirm ซ้ำ | ฟังก์ชันเดียว |
| [2](#เคสที่-2--หน้าแอดมินทั้งสไลซ์) | หน้าแอดมินทั้งชุด — 5 หน้า React + admin module ของ Nest | ทั้งฟีเจอร์ |

---

## เคสที่ 1 — กันกด Confirm ซ้ำ

ส่วนที่เลือก: กันกด Confirm ซ้ำที่ Nest (`IdempotencyInterceptor`)  
เหตุที่เลือก: เป็นจุดที่ AI มักทำให้ผิดโดยไม่ตั้งใจ และเป็นคนละปัญหาจากกันจองซ้อน (S-05 ≠ C-01)

### 1. AI Generated

ร่างแรกที่ AI เสนอหลังอ่านโจทย์ “กดยืนยันสองครั้งต้องได้ใบเดียว” คือกันซ้ำด้วย unique บนตัวการจอง

```ts
// ร่างแรก — ไม่ได้อยู่ใน repo
await db.insert(reservations).values(input)
  .onConflictDoNothing({
    target: [reservations.userId, reservations.compartmentId, reservations.startTime],
  })
```

หรืออีกแบบที่พบบ่อย: เก็บ response ทุกสถานะรวม 409 แล้ว replay เป็น 201

```ts
// ร่างแรกอีกแบบ — cache ทุกอย่างที่ออกจาก handler
return next.handle().pipe(
  tap(async (body) => {
    await db.insert(idempotencyKeys).values({
      key,
      responseBody: body,
    })
  }),
)
```

### 2. Review

| ด้าน | ผลตรวจร่างแรก |
|------|----------------|
| ความถูกต้อง | Unique `(user, compartment, start)` ทำให้ยกเลิกแล้วจองช่วงเดิมไม่ได้ ทั้งที่ BR-09 / I-02 ต้องการให้ช่องว่างทันที |
| บั๊ก | ถ้ายิงคนละขนาดหรือคนละตู้ด้วย key เดิม ร่างที่ cache 409 จะทำให้รอบแก้เวลาได้ 409 ปลอม |
| ความปลอดภัย | ถ้า unique อยู่ที่ `key` อย่างเดียว โดยไม่ผูก `user_id` ผู้ใช้ A เดา key ของ B แล้วอ่านใบจองคนอื่นได้ |
| ประสิทธิภาพ | `onConflictDoNothing` ไม่ได้ล็อกช่อง คนละคนยังแย่ง Large ใบสุดท้ายพร้อมกันได้ — นี่คือ C-01 ไม่ใช่ S-05 |
| การดูแลรักษา | ตรรกะกันซ้ำฝังใน service ปนกับสร้างใบจอง เพิ่ม `GET` ภายหลังแล้วซ้ำเงื่อนไขยาก |

ข้อที่คนล็อกไว้ก่อนรีวิว: **ห้ามใช้ unique บน `(user_id, compartment_id, start_time)`** เพราะยกเลิกแล้วจองใหม่ได้ · ใช้ `(user_id, key)` · เก็บเฉพาะคำขอที่สร้างสำเร็จ

### 3. Final

โค้ดที่อยู่ใน repo ตอนนี้

```17:72:apps/api/src/reservations/idempotency.interceptor.ts
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // ...
    if (!key) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key header is required',
      );
    }

    const userId = request.user.id;
    // lookup ด้วย (user_id, key) แล้วคืนใบเดิมเป็น 201
    // insert เฉพาะหลัง next.handle() สำเร็จ — 409 จะไม่ถูกเก็บ
```

ฝั่งหน้าบ้าน key ถูกสร้างครั้งเดียวต่อหน้า Reserve แล้วปุ่มผูก `isPending`

```30:63:apps/web/src/pages/ReservePage.tsx
  const idempotencyKey = useRef(crypto.randomUUID())
  // ...
        disabled={mutation.isPending || station.available[size] === 0}
```

ชั้นฐานข้อมูลยังกันคนละคนอยู่ดี — interceptor นี้ไม่ได้แทน `FOR UPDATE` + `EXCLUDE`

พิสูจน์: `apps/api/test/reservations.e2e-spec.ts` — reuse key ได้ใบเดิม · Alice/Bob พร้อมกันได้ 201+409


---

## เคสที่ 2 — หน้าแอดมินทั้งสไลซ์

ส่วนที่เลือก: หน้าแอดมินทั้งชุด — `apps/web/src/pages/admin/*` + `apps/api/src/admin/*` + guard สองตัว  
เหตุที่เลือก: เคสที่ 1 เป็นฟังก์ชันเดียว เคสนี้เป็นสไลซ์ที่ AI สร้างทั้งก้อน จึงเห็นทั้งบั๊กระดับ query
และปัญหาเชิงโครงสร้างที่โผล่เฉพาะตอนโค้ดถูกคัดลอกซ้ำหลายหน้า

ตามย้อนได้จริงใน git — ก่อนรีวิว: `0cfda33` · หลังแก้: `ba543d3` → `b7cabb2` → `cbb8f94`

### 1. AI Generated

**(ก) รายการสถานี — ดึงทั้งตารางแล้วค่อยตัดหน้าใน JS**

```ts
// 0cfda33 · apps/api/src/admin/stations/admin-stations.service.ts
const stations = query.status
  ? await db.select().from(lockerStations).where(eq(lockerStations.status, query.status))
  : await db.select().from(lockerStations);

const paged = stations.slice((page - 1) * limit, page * limit);
// ...
return { items, page, limit, total: stations.length };
```

**(ข) ทุกหน้าแอดมินเขียนสถานะการโหลดเองซ้ำ ๆ โครงเดียวกัน**

```tsx
// 0cfda33 · AdminPaymentsPage.tsx — โครงนี้ซ้ำอยู่ในทั้ง 6 หน้า
const payments = useQuery({
  queryKey: ['admin', 'payments', method, page, token],
  queryFn: () => listAdminPayments(token, { ... }),
  enabled: Boolean(token),
})

{payments.isLoading ? <SkeletonList count={4} /> : null}
{payments.isError ? <ErrorState ... /> : null}
{payments.isSuccess && payments.data.items.length === 0 ? <EmptyState ... /> : null}
{payments.isSuccess && payments.data.items.length > 0 ? (
  <> {/* thead + tbody + TablePagination เขียนมือทุกหน้า */} </>
) : null}
```

**(ค) guard สองตัวยิงข้ามเน็ตทุก request**

```ts
// 0cfda33 · auth.guard.ts
const { data, error } = await this.supabase().auth.getUser(token);

// 0cfda33 · admin.guard.ts
const [row] = await db.select({ role: users.role, status: users.status })
  .from(users).where(eq(users.id, user.id));
```

### 2. Review

| ด้าน | ผลตรวจ |
|------|--------|
| ความถูกต้อง | `list()` ไม่มี `ORDER BY` เลย — Postgres ไม่รับประกันลำดับแถว พอมี `INSERT`/`UPDATE` ลำดับขยับได้ ทำให้แถวเดิมกระโดดข้ามหน้าหรือโผล่ซ้ำ อาการที่ผู้ใช้เห็นคือ “กดบันทึกแล้วข้อมูลหาย” ทั้งที่ข้อมูลอยู่ครบ |
| บั๊ก | **(1)** คีย์ของ React Query มี `token` อยู่ด้วย Supabase หมุน access token เป็นระยะ พอ token เปลี่ยนทุก query กลายเป็นคีย์ใหม่ = ล้างแคชโหลดใหม่ทั้งหน้าโดยไม่มีเหตุ · **(2)** ฟอร์มเพิ่มช่องเรียก `setLabel('')` ก่อนรู้ผล ชื่อซ้ำได้ 409 แล้วค่าที่พิมพ์หายไปแล้ว · **(3)** `POST /admin/customers` ประกอบ response เองโดยไม่มี `created_at` ทั้งที่ type ฝั่ง web ประกาศว่ามี |
| ความปลอดภัย | AdminGuard ถูกต้อง — เช็คทั้ง `role` และ `status` ไม่ได้เชื่อ claim ใน JWT · การลบยืนยันด้วย `window.confirm` ฝั่ง client แต่ฝั่ง API เช็ค `HAS_RESERVATIONS` ซ้ำอยู่แล้ว ไม่ได้ trust ฝั่งหน้าบ้าน · **ข้อควรรู้:** RLS ที่เปิดไว้ไม่ได้ช่วยเส้นทาง API เพราะ Nest ต่อฐานข้อมูลด้วย service role ซึ่งข้าม RLS ทั้งหมด การตรวจสิทธิ์จึงพึ่ง guard กับ `assertOwner` ล้วน ๆ |
| ประสิทธิภาพ | ทุก request ของแอดมิน = ยิง Supabase Auth ข้ามเน็ต 1 รอบ + query ตาราง `users` อีก 1 รอบ ก่อนเข้า handler หน้า `/admin` ยิงหลายคำขอพร้อมกันจึงหน่วงเป็นวินาที · ซ้อนกับ `list()` ที่ดึงทั้งตารางมาทุกครั้ง |
| การดูแลรักษา | 6 หน้าเขียน loading/error/empty/table/pagination ซ้ำโครงเดียวกัน แก้พฤติกรรมร่วมทีเดียวไม่ได้ · ตารางบังคับ `min-width: 640px` บนมือถือจึงต้องเลื่อนแนวนอนอ่าน |

### 3. Final

**แยกชั้นกลางออกมา** — `apps/web/src/lib/adminQuery.ts` และ `apps/web/src/ui/AdminDataTable.tsx`
แต่ละหน้าเหลือแค่ประกาศว่ามีคอลัมน์อะไร (AdminPaymentsPage 121 → 75 บรรทัด)

```tsx
// ba543d3 · AdminPaymentsPage.tsx
const list = useAdminList({
  resource: 'payments',
  filters: ['method'],
  fetch: (token, query) => listAdminPayments(token, query),
})

<AdminDataTable query={list.query} columns={COLUMNS} rowKey={(item) => item.id} ... />
```

**คีย์แคชผูกกับ user id ไม่ใช่ token** — token อ่านสด ๆ จาก ref ตอนยิงจริง

```ts
// ba543d3 · lib/adminQuery.ts
queryKey: ['admin', resource, values, page, userId],
queryFn: () => fetch(ref.current, params),
```

**รายการสถานีตัดหน้าใน SQL + มีลำดับที่แน่นอน**

```ts
// b7cabb2 · admin-stations.service.ts
db.select().from(lockerStations).where(where)
  .orderBy(desc(lockerStations.createdAt), desc(lockerStations.id))
  .limit(limit).offset((page - 1) * limit),
db.select({ n: count() }).from(lockerStations).where(where),
```

**แคชผลตรวจสิทธิ์แบบมีอายุ** — `apps/api/src/auth/auth-cache.ts` (token 60 วิ · สิทธิ์แอดมิน 30 วิ)
และเรียก `forgetUser(id)` ทันทีที่ให้/ถอดสิทธิ์หรือลบผู้ใช้ เพื่อไม่ต้องรอ TTL

**อื่น ๆ** — ยืนยันลบด้วยโมดัลของแอปแทน `window.confirm` · ล้างช่องกรอกเมื่อบันทึกสำเร็จเท่านั้น ·
เขียนผลลัพธ์ที่ API ตอบกลับลงแคชทันที (`applyToCache`) ไม่ต้องรอ refetch · จอเล็กแปลงตารางเป็นการ์ด

### ข้อที่รีวิวเจอแต่ยังไม่แก้

จงใจปล่อยไว้ พร้อมเหตุผล ไม่ได้มองข้าม

| ข้อ | ทำไมยังไม่แก้ |
|-----|----------------|
| `UpdateAdminCustomerDto` รับ `status: 'disabled'` แต่ CHECK ในดีบีรับแค่ `active \| inactive` | ยังไม่มีหน้าจอไหนเรียก ต้องตัดสินก่อนว่าจะยึดคำไหนแล้วแก้ทั้งสองฝั่งพร้อมกัน |
| `expireOverdue()` ยิง `UPDATE` ทุกครั้งที่อ่านรายการ | ถูกต้องแต่แพง ควรย้ายเป็นงานตามเวลา ซึ่งอยู่นอกขอบเขตรอบนี้ |
| RLS ไม่คุ้มเส้นทาง API | เป็นผลจากการเลือกให้ Nest ถือ service role ตั้งแต่แรก เปลี่ยนแล้วกระทบทั้งระบบ บันทึกไว้เป็นข้อจำกัดที่รู้ตัว |
