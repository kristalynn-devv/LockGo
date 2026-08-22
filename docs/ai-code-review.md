# LockGo — AI Code Review

ส่วนที่เลือก: กันกด Confirm ซ้ำที่ Nest (`IdempotencyInterceptor`)  
เหตุที่เลือก: เป็นจุดที่ AI มักทำให้ผิดโดยไม่ตั้งใจ และเป็นคนละปัญหาจากกันจองซ้อน (S-05 ≠ C-01)

ตรวจ 5 ด้านตาม `[A]`: ความถูกต้อง · บั๊ก · ความปลอดภัย · ประสิทธิภาพ · การดูแลรักษา

## 1. AI Generated

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

## 2. Review

| ด้าน | ผลตรวจร่างแรก |
|------|----------------|
| ความถูกต้อง | Unique `(user, compartment, start)` ทำให้ยกเลิกแล้วจองช่วงเดิมไม่ได้ ทั้งที่ BR-09 / I-02 ต้องการให้ช่องว่างทันที |
| บั๊ก | ถ้ายิงคนละขนาดหรือคนละตู้ด้วย key เดิม ร่างที่ cache 409 จะทำให้รอบแก้เวลาได้ 409 ปลอม |
| ความปลอดภัย | ถ้า unique อยู่ที่ `key` อย่างเดียว โดยไม่ผูก `user_id` ผู้ใช้ A เดา key ของ B แล้วอ่านใบจองคนอื่นได้ |
| ประสิทธิภาพ | `onConflictDoNothing` ไม่ได้ล็อกช่อง คนละคนยังแย่ง Large ใบสุดท้ายพร้อมกันได้ — นี่คือ C-01 ไม่ใช่ S-05 |
| การดูแลรักษา | ตรรกะกันซ้ำฝังใน service ปนกับสร้างใบจอง เพิ่ม `GET` ภายหลังแล้วซ้ำเงื่อนไขยาก |

ข้อที่คนล็อกไว้ก่อนรีวิว: **ห้ามใช้ unique บน `(user_id, compartment_id, start_time)`** เพราะยกเลิกแล้วจองใหม่ได้ · ใช้ `(user_id, key)` · เก็บเฉพาะคำขอที่สร้างสำเร็จ

## 3. Final

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
