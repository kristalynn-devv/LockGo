import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http-error';
import {
  assertOwner,
  canCancel,
  effectiveStatus,
  isValidReservationWindow,
} from './reservation-rules';

describe('reservation rules', () => {
  const now = new Date('2026-08-23T08:00:00.000Z');
  const start = new Date('2026-08-23T10:00:00.000Z');

  it('AC-12 rejects a start in the past', () => {
    expect(isValidReservationWindow(new Date('2026-08-23T07:00:00.000Z'), 4, now)).toBe(
      false,
    );
  });

  it('AC-12 rejects a start more than 7 days ahead', () => {
    expect(isValidReservationWindow(new Date('2026-08-31T09:00:00.000Z'), 4, now)).toBe(
      false,
    );
  });

  it('AC-12 rejects a duration below 1 hour', () => {
    expect(isValidReservationWindow(start, 0, now)).toBe(false);
  });

  it('AC-12 rejects a duration above 24 hours', () => {
    expect(isValidReservationWindow(start, 25, now)).toBe(false);
  });

  it('AC-12 accepts a start within 7 days and a duration of 4 hours', () => {
    expect(isValidReservationWindow(start, 4, now)).toBe(true);
  });

  it('AC-15 throws FORBIDDEN when another user claims the row', () => {
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

  it('AC-16 allows cancel while status is Reserved', () => {
    expect(canCancel('Reserved')).toBe(true);
  });

  it('AC-17 rejects cancel when status is Cancelled', () => {
    expect(canCancel('Cancelled')).toBe(false);
  });

  it('AC-17 rejects cancel when status is Expired', () => {
    expect(canCancel('Expired')).toBe(false);
  });

  it('AC-19 treats a Reserved row past the deadline as Expired', () => {
    expect(
      effectiveStatus(
        { status: 'Reserved', noShowDeadline: new Date('2026-08-23T07:15:00.000Z') },
        now,
      ),
    ).toBe('Expired');
  });

  it('AC-19 does not allow cancel after the deadline has passed', () => {
    const status = effectiveStatus(
      { status: 'Reserved', noShowDeadline: new Date('2026-08-23T07:15:00.000Z') },
      now,
    );
    expect(canCancel(status)).toBe(false);
  });
});
