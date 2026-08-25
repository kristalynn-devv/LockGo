import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { Response } from 'express';
import { Observable, firstValueFrom, from } from 'rxjs';
import { AuthUser } from '../auth/auth.guard';
import { ApiError } from '../common/http-error';
import { getDb } from '../db/database';
import { idempotencyKeys } from '../db/schema';

const inflightByUserKey = new Map<string, Promise<void>>();

/** Serialize same (user, key) so two in-flight POSTs cannot both miss the lookup. */
export async function runExclusive<T>(
  userId: string,
  key: string,
  fn: () => Promise<T>,
  locks: Map<string, Promise<void>> = inflightByUserKey,
): Promise<T> {
  const lockId = `${userId}:${key}`;
  let release: () => void = () => undefined;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const previous = locks.get(lockId) ?? Promise.resolve();
  const done = previous.then(() => next);
  locks.set(lockId, done);
  try {
    await previous;
    return await fn();
  } finally {
    release();
    if (locks.get(lockId) === done) {
      locks.delete(lockId);
    }
  }
}

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined>; user: AuthUser }>();
    const response = context.switchToHttp().getResponse<Response>();
    const raw = request.headers['idempotency-key'];
    const key = Array.isArray(raw) ? raw[0] : raw;

    if (!key) {
      throw new ApiError(
        HttpStatus.BAD_REQUEST,
        'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key header is required',
      );
    }

    const userId = request.user.id;

    return from(
      runExclusive(userId, key, () => this.replayOrCreate(userId, key, response, next)),
    );
  }

  private async replayOrCreate(
    userId: string,
    key: string,
    response: Response,
    next: CallHandler,
  ): Promise<unknown> {
    const db = getDb();
    const existing = await db
      .select()
      .from(idempotencyKeys)
      .where(
        and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key)),
      );

    if (existing[0]) {
      response.status(HttpStatus.CREATED);
      return existing[0].responseBody;
    }

    const body = await firstValueFrom(next.handle());
    await db.insert(idempotencyKeys).values({
      userId,
      key,
      reservationId:
        body && typeof body === 'object' && 'id' in body
          ? String((body as { id: string }).id)
          : null,
      responseBody: body as object,
    });
    response.status(HttpStatus.CREATED);
    return body;
  }
}
