import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http-error';
import {
  accessCode,
  assertOwner,
  canCancel,
  canDeposit,
  canPay,
  canPickup,
  effectiveStatus,
  isValidReservationWindow,
  visibleAccessCode,
} from './reservation-rules';

describe('reservation rules', () => {
  // ล็อกนาฬิกาไว้เพื่อไม่ให้เคสผูกกับเวลาจริง
  const now = new Date('2026-08-23T08:00:00.000Z');
  const start = new Date('2026-08-23T10:00:00.000Z'); // อีก 2 ชม. — อยู่ในหน้าต่าง 7 วัน

  it('AC-12 rejects a start in the past', () => {
    // U-03 / BR-07 — 07:00 อยู่ก่อน now 08:00 ห้ามจองย้อนหลัง
    expect(isValidReservationWindow(new Date('2026-08-23T07:00:00.000Z'), 4, now)).toBe(
      false,
    );
  });

  it('AC-12 rejects a start more than 7 days ahead', () => {
    // เพดานล่วงหน้า = 30 ส.ค. 08:00; 31 ส.ค. 09:00 เลย 7 วัน
    expect(isValidReservationWindow(new Date('2026-08-31T09:00:00.000Z'), 4, now)).toBe(
      false,
    );
  });

  it('AC-12 rejects a duration below 1 hour', () => {
    // U-03 — ระยะขั้นต่ำ 1 ชม. เลือกทีละชั่วโมง
    expect(isValidReservationWindow(start, 0, now)).toBe(false);
  });

  it('AC-12 rejects a duration above 24 hours', () => {
    // U-03 — ระยะสูงสุด 24 ชม.
    expect(isValidReservationWindow(start, 25, now)).toBe(false);
  });

  it('AC-12 accepts a start within 7 days and a duration of 4 hours', () => {
    // เริ่ม 10:00 ระยะ 4 ชม. อยู่ในช่วงที่ล็อกไว้
    expect(isValidReservationWindow(start, 4, now)).toBe(true);
  });

  it('AC-15 throws FORBIDDEN when another user claims the row', () => {
    // Alice เป็นเจ้าของ — Bob อ่านใบนี้ต้องได้ 403
    try {
      assertOwner('alice', 'bob');
      throw new Error('expected FORBIDDEN');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect((error as ApiError).getResponse()).toMatchObject({ code: 'FORBIDDEN' });
    }
  });

  it('AC-15 allows the owner to read their row', () => {
    expect(() => assertOwner('alice', 'alice')).not.toThrow();
  });

  it('AC-16 allows cancel only while Reserved and unpaid', () => {
    // BR-09 — จ่ายแล้วใช้รหัสได้แล้ว ยกเลิกไม่ได้
    expect(canCancel('Reserved')).toBe(true);
    expect(canCancel('Reserved', new Date('2026-08-23T08:01:00.000Z'))).toBe(false);
  });

  it('AC-17 rejects cancel when status is Cancelled', () => {
    expect(canCancel('Cancelled')).toBe(false);
  });

  it('AC-17 rejects cancel when status is Expired', () => {
    expect(canCancel('Expired')).toBe(false);
  });

  it('AC-19 treats a Reserved row past the deadline as Expired', () => {
    // C-03 / U-02 — deadline 07:15 เลยแล้วที่ now 08:00 ไม่พึ่ง background job
    expect(
      effectiveStatus(
        { status: 'Reserved', noShowDeadline: new Date('2026-08-23T07:15:00.000Z') },
        now,
      ),
    ).toBe('Expired');
  });

  it('AC-19 does not allow cancel after the deadline has passed', () => {
    // Expired ไม่ใช่ Reserved จึงยกเลิกไม่ได้ (BR-09)
    const status = effectiveStatus(
      { status: 'Reserved', noShowDeadline: new Date('2026-08-23T07:15:00.000Z') },
      now,
    );
    expect(canCancel(status)).toBe(false);
  });

  it('AC-23 allows deposit only after payment while Reserved', () => {
    // BR-10 / P-02 — ฝากได้ตั้งแต่จ่ายแล้ว ไม่ต้องรอชั่วโมงเริ่ม
    expect(canDeposit('Reserved')).toBe(false);
    expect(canDeposit('Reserved', new Date('2026-08-23T08:01:00.000Z'))).toBe(true);
  });

  it('AC-24 rejects deposit when status is Active or Completed', () => {
    // ฝากแล้วหรือรับแล้ว — ฝากซ้ำไม่ได้
    const paid = new Date('2026-08-23T08:01:00.000Z');
    expect(canDeposit('Active', paid)).toBe(false);
    expect(canDeposit('Completed', paid)).toBe(false);
  });

  it('AC-24 rejects deposit after the no-show deadline', () => {
    // เลย no_show_deadline แล้วสถานะเป็น Expired — ฝากไม่ได้
    const status = effectiveStatus(
      { status: 'Reserved', noShowDeadline: new Date('2026-08-23T07:15:00.000Z') },
      now,
    );
    expect(canDeposit(status)).toBe(false);
  });

  it('AC-25 allows pickup while status is Active', () => {
    // BR-11 — รับของได้เฉพาะตอนของอยู่ในตู้
    expect(canPickup('Active')).toBe(true);
  });

  it('AC-26 rejects pickup when status is Reserved or Completed', () => {
    // ยังไม่ฝาก หรือรับไปแล้ว
    expect(canPickup('Reserved')).toBe(false);
    expect(canPickup('Completed')).toBe(false);
  });

  it('derives a 6-digit mock access code from the reservation number', () => {
    // BR-12 — รหัสจำลองจากเลขท้ายหมายเลขจอง ไม่ใช่ QR จริง
    expect(accessCode('LK-20260813-000123')).toBe('000123');
  });

  it('AC-27 hides the access code until payment', () => {
    // BR-13 — ยังไม่จ่าย access_code เป็น null
    expect(visibleAccessCode('LK-20260813-000123', null)).toBeNull();
  });

  it('AC-28 reveals the access code after payment', () => {
    // จ่ายแล้วจึงคืนรหัส 6 หลักให้วาด QR บนมือถือ
    expect(visibleAccessCode('LK-20260813-000123', new Date('2026-08-23T08:01:00.000Z'))).toBe(
      '000123',
    );
  });

  it('AC-28 allows mock pay while Reserved and unpaid', () => {
    // AC-29 — จ่ายซ้ำหรือใบ Expired ต้องจ่ายไม่ได้
    expect(canPay('Reserved')).toBe(true);
    expect(canPay('Reserved', new Date('2026-08-23T08:01:00.000Z'))).toBe(false);
    expect(canPay('Expired')).toBe(false);
  });
});
