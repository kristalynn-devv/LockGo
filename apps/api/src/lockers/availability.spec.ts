import {
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

  it('rejects a booking when a reserved slot overlaps the requested window', () => {
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

  it('treats a reserved row past the no-show deadline as free', () => {
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
    const aStart = new Date('2026-08-23T10:00:00.000Z');
    const aEnd = new Date('2026-08-23T12:00:00.000Z');
    expect(
      overlaps(aStart, aEnd, new Date('2026-08-23T12:00:00.000Z'), new Date('2026-08-23T14:00:00.000Z')),
    ).toBe(false);
    expect(
      overlaps(aStart, aEnd, new Date('2026-08-23T11:00:00.000Z'), new Date('2026-08-23T13:00:00.000Z')),
    ).toBe(true);
  });
});
