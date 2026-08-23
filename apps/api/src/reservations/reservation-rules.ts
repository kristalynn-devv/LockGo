import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http-error';

const MAX_ADVANCE_MS = 7 * 24 * 60 * 60 * 1000;

export function isValidReservationWindow(
  start: Date,
  durationHours: number,
  at = new Date(),
) {
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 24) {
    return false;
  }
  if (Number.isNaN(start.getTime()) || start < at) {
    return false;
  }
  return start.getTime() <= at.getTime() + MAX_ADVANCE_MS;
}

export function effectiveStatus(
  row: { status: string; noShowDeadline: Date },
  at = new Date(),
) {
  if (row.status === 'Reserved' && row.noShowDeadline < at) {
    return 'Expired';
  }
  return row.status;
}

export function isPaid(paidAt: Date | null | undefined) {
  return paidAt != null;
}

export function canCancel(status: string, paidAt: Date | null = null) {
  return status === 'Reserved' && !isPaid(paidAt);
}

export function canPay(status: string, paidAt: Date | null = null) {
  return status === 'Reserved' && !isPaid(paidAt);
}

export function canDeposit(status: string, paidAt: Date | null = null) {
  return status === 'Reserved' && isPaid(paidAt);
}

export function canPickup(status: string) {
  return status === 'Active';
}

/** รหัสเปิดตู้จำลอง — ตัวเลขท้ายหมายเลขจอง 6 หลัก ไม่ใช่ QR จริง */
export function accessCode(reservationNumber: string) {
  const digits = reservationNumber.replace(/\D/g, '');
  return digits.slice(-6).padStart(6, '0');
}

export function visibleAccessCode(
  reservationNumber: string,
  paidAt: Date | null | undefined,
) {
  return isPaid(paidAt) ? accessCode(reservationNumber) : null;
}

export function isOwner(ownerId: string, userId: string) {
  return ownerId === userId;
}

export function assertOwner(ownerId: string, userId: string) {
  if (!isOwner(ownerId, userId)) {
    throw new ApiError(
      HttpStatus.FORBIDDEN,
      'FORBIDDEN',
      'You do not have access to this reservation',
    );
  }
}
