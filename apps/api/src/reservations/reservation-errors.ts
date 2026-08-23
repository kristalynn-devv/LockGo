import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http-error';

function sqlErrorText(error: unknown): { codes: string[]; text: string } {
  const codes: string[] = [];
  const messages: string[] = [];
  let current: unknown = error;
  for (let depth = 0; current && depth < 8; depth += 1) {
    if (typeof current === 'string') {
      messages.push(current);
      break;
    }
    if (typeof current !== 'object') {
      break;
    }
    const row = current as {
      code?: unknown;
      message?: unknown;
      detail?: unknown;
      cause?: unknown;
    };
    if (typeof row.code === 'string') {
      codes.push(row.code);
    }
    if (typeof row.message === 'string') {
      messages.push(row.message);
    }
    if (typeof row.detail === 'string') {
      messages.push(row.detail);
    }
    current = row.cause;
  }
  return { codes, text: messages.join('\n') };
}

export function mapReservationCreateError(error: unknown): ApiError {
  const { codes, text } = sqlErrorText(error);

  if (text.includes('NO_AVAILABILITY') || codes.includes('23P01')) {
    return new ApiError(
      HttpStatus.CONFLICT,
      'NO_AVAILABILITY',
      'That locker is no longer available for the selected time',
    );
  }
  if (text.includes('STATION_UNAVAILABLE')) {
    return new ApiError(
      HttpStatus.CONFLICT,
      'STATION_UNAVAILABLE',
      'This locker is not open for booking',
    );
  }
  if (
    text.includes('START_IN_PAST') ||
    text.includes('START_TOO_FAR') ||
    text.includes('INVALID_DURATION')
  ) {
    return new ApiError(
      HttpStatus.BAD_REQUEST,
      'INVALID_RESERVATION',
      'The selected time is not valid',
    );
  }
  if (text.includes('STATION_NOT_FOUND') || text.includes('USER_NOT_FOUND')) {
    return new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Resource not found');
  }

  return new ApiError(
    HttpStatus.INTERNAL_SERVER_ERROR,
    'INTERNAL_ERROR',
    'Something went wrong. Please try again.',
  );
}
