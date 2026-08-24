/* --------------------------------------------------------------------------
   ทุก request ของแอดมินเคยยิง Supabase auth.getUser + query ตาราง users ใหม่ทุกครั้ง
   = round trip ข้ามเน็ต 2 รอบต่อ 1 คำขอ หน้าแอดมินยิงหลายคำขอพร้อมกันเลยหน่วง
   แคชสั้น ๆ ในหน่วยความจำตัดตรงนั้นออก โดยยังหมดอายุเร็วพอที่การถอดสิทธิ์จะมีผลทันที
   -------------------------------------------------------------------------- */

type Entry<T> = { value: T; expiresAt: number };

export class TtlCache<T> {
  private entries = new Map<string, Entry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly max = 500,
  ) {}

  get(key: string): T | undefined {
    const hit = this.entries.get(key);
    if (!hit) {
      return undefined;
    }
    if (hit.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    if (this.entries.size >= this.max) {
      // Map จำลำดับที่ใส่ ตัวแรกคือตัวที่เก่าที่สุด
      const oldest = this.entries.keys().next();
      if (!oldest.done) {
        this.entries.delete(oldest.value);
      }
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}

export type CachedAuthUser = { id: string; email?: string };

/** token → ผู้ใช้ที่ยืนยันแล้ว (สั้นกว่าอายุ token มาก) */
export const authUserCache = new TtlCache<CachedAuthUser>(60_000);

/** user id → เป็นแอดมินที่ active หรือไม่ */
export const adminRoleCache = new TtlCache<boolean>(30_000);

/** เรียกทันทีที่มีการให้/ถอดสิทธิ์หรือลบผู้ใช้ เพื่อไม่ต้องรอ TTL */
export function forgetUser(userId: string): void {
  adminRoleCache.delete(userId);
}
