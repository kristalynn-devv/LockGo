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
