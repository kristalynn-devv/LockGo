import {
  freeHourRanges,
  isCompartmentFree,
  isLiveReservation,
  overlaps,
} from './availability';

const compartmentId = 'comp-1';

function reservation(overrides: {
  start: string;
  end: string;
  status?: string;
  deadline?: string;
}) {
  return {
    compartmentId,
    startTime: new Date(overrides.start),
    endTime: new Date(overrides.end),
    status: overrides.status ?? 'Reserved',
    noShowDeadline: new Date(overrides.deadline ?? '2099-01-01T00:00:00.000Z'),
  };
}

describe('availability', () => {
  it('allows a booking when the compartment has no overlapping live reservation', () => {
    // จอง 12:00–14:00 หลังช่อง 10:00–12:00 ว่าง — ช่วงไม่ทับกัน
    const free = isCompartmentFree(
      compartmentId,
      [
        reservation({
          start: '2026-08-23T10:00:00.000Z',
          end: '2026-08-23T12:00:00.000Z',
        }),
      ],
      new Date('2026-08-23T12:00:00.000Z'),
      new Date('2026-08-23T14:00:00.000Z'),
    );

    expect(free).toBe(true);
  });

  it('AC-03 rejects a booking when a reserved slot overlaps the requested window', () => {
    // BR-02 / C-01 — ช่องเดียวกันจองซ้อนในช่วงเดียวกันไม่ได้
    const free = isCompartmentFree(
      compartmentId,
      [
        reservation({
          start: '2026-08-23T10:00:00.000Z',
          end: '2026-08-23T14:00:00.000Z',
        }),
      ],
      new Date('2026-08-23T13:00:00.000Z'),
      new Date('2026-08-23T15:00:00.000Z'),
    );

    expect(free).toBe(false);
  });

  it('AC-19 treats a reserved row past the no-show deadline as free', () => {
    // C-07 / U-02 — เลย no_show_deadline แล้วไม่นับเป็น live ช่องกลับมาว่าง
    const now = new Date('2026-08-23T10:20:00.000Z');
    const row = reservation({
      start: '2026-08-23T10:00:00.000Z',
      end: '2026-08-23T12:00:00.000Z',
      deadline: '2026-08-23T10:15:00.000Z',
    });

    expect(isLiveReservation(row, now)).toBe(false);
    expect(
      isCompartmentFree(
        compartmentId,
        [row],
        new Date('2026-08-23T10:00:00.000Z'),
        new Date('2026-08-23T12:00:00.000Z'),
        now,
      ),
    ).toBe(true);
  });

  it('detects overlapping intervals and ignores touching edges', () => {
    // 12:00 ต่อ 12:00 ไม่ทับ (half-open) · 11:00–13:00 ทับ 10:00–12:00
    const aStart = new Date('2026-08-23T10:00:00.000Z');
    const aEnd = new Date('2026-08-23T12:00:00.000Z');
    expect(
      overlaps(aStart, aEnd, new Date('2026-08-23T12:00:00.000Z'), new Date('2026-08-23T14:00:00.000Z')),
    ).toBe(false);
    expect(
      overlaps(aStart, aEnd, new Date('2026-08-23T11:00:00.000Z'), new Date('2026-08-23T13:00:00.000Z')),
    ).toBe(true);
  });

  it('omits a booked hour from free ranges for that size', () => {
    // I-03 / AC-20 — Available Time ตัดช่วงที่ถูกจองออกจาก free ranges
    const booked = reservation({
      start: '2026-08-23T10:00:00.000Z',
      end: '2026-08-23T12:00:00.000Z',
    });
    const ranges = freeHourRanges(
      [compartmentId],
      [booked],
      new Date('2026-08-23T09:00:00.000Z'),
      new Date('2026-08-23T14:00:00.000Z'),
      new Date('2026-08-23T08:00:00.000Z'),
    );

    expect(ranges).toEqual([
      {
        start: new Date('2026-08-23T09:00:00.000Z'),
        end: new Date('2026-08-23T10:00:00.000Z'),
      },
      {
        start: new Date('2026-08-23T12:00:00.000Z'),
        end: new Date('2026-08-23T14:00:00.000Z'),
      },
    ]);
  });
});
