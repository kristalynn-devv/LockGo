import { compartmentSize } from '../db/schema';

export type Size = (typeof compartmentSize.enumValues)[number];

export type LiveReservation = {
  compartmentId: string;
  startTime: Date;
  endTime: Date;
  status: string;
  noShowDeadline: Date;
};

export function isLiveReservation(row: LiveReservation, at = new Date()) {
  if (row.status === 'Active') {
    return true;
  }
  return row.status === 'Reserved' && row.noShowDeadline >= at;
}

export function overlaps(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
) {
  return startA < endB && startB < endA;
}

export function isCompartmentFree(
  compartmentId: string,
  reservations: LiveReservation[],
  start: Date,
  end: Date,
  at = new Date(),
) {
  return !reservations.some(
    (row) =>
      row.compartmentId === compartmentId &&
      isLiveReservation(row, at) &&
      overlaps(row.startTime, row.endTime, start, end),
  );
}

/** ช่วงว่างรายชั่วโมงที่ต่อกันได้ - ชั่วโมงที่ถูกจองแล้วไม่อยู่ในผล */
export function freeHourRanges(
  compartmentIds: string[],
  reservations: LiveReservation[],
  from: Date,
  to: Date,
  at = new Date(),
): { start: Date; end: Date }[] {
  const slots: { start: Date; end: Date }[] = [];
  const cursor = new Date(from);
  cursor.setMinutes(0, 0, 0);
  if (cursor < from) {
    cursor.setHours(cursor.getHours() + 1);
  }

  while (cursor < to) {
    const end = new Date(cursor.getTime() + 60 * 60 * 1000);
    const free = compartmentIds.some((id) =>
      isCompartmentFree(id, reservations, cursor, end, at),
    );
    if (free) {
      slots.push({ start: new Date(cursor), end });
    }
    cursor.setHours(cursor.getHours() + 1);
  }

  return mergeHourSlots(slots);
}

export function mergeHourSlots(slots: { start: Date; end: Date }[]) {
  if (slots.length === 0) {
    return [];
  }
  const merged = [{ ...slots[0] }];
  for (const slot of slots.slice(1)) {
    const last = merged[merged.length - 1];
    if (slot.start.getTime() <= last.end.getTime()) {
      last.end = slot.end;
    } else {
      merged.push({ ...slot });
    }
  }
  return merged;
}
