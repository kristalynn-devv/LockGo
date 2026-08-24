import { mapReservationCreateError } from './reservation-errors';

describe('mapReservationCreateError', () => {
  it('maps exclusion 23P01 to 409', () => {
    // S-04 — EXCLUDE USING gist ชนกัน = ไม่มีช่องว่าง → 409 NO_AVAILABILITY
    const mapped = mapReservationCreateError({ code: '23P01', message: 'conflicting key value' });
    expect(mapped.getStatus()).toBe(409);
    expect(mapped.getResponse()).toMatchObject({ code: 'NO_AVAILABILITY' });
  });

  it('maps wrapped NO_AVAILABILITY raise to 409', () => {
    // ฟังก์ชัน SQL raise NO_AVAILABILITY — unwrap จาก cause แล้ว map เป็น 409
    const mapped = mapReservationCreateError({
      message: 'Failed query: select * from private.create_lockgo_reservation',
      cause: { code: 'P0001', message: 'NO_AVAILABILITY' },
    });
    expect(mapped.getStatus()).toBe(409);
    expect(mapped.getResponse()).toMatchObject({ code: 'NO_AVAILABILITY' });
  });

  it('maps wrapped 23P01 on cause to 409', () => {
    // Drizzle/postgres ห่อ error — 23P01 อยู่ใน cause chain
    const mapped = mapReservationCreateError({
      message: 'Failed query',
      cause: { code: '23P01', message: 'conflicting key value violates exclusion constraint' },
    });
    expect(mapped.getStatus()).toBe(409);
  });

  it('keeps unknown errors as 500', () => {
    // error ที่ไม่รู้จัก — ไม่ leak รายละเอียด SQL ให้ client
    const mapped = mapReservationCreateError({ code: '23505', message: 'unique_violation' });
    expect(mapped.getStatus()).toBe(500);
    expect(mapped.getResponse()).toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
