import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { HttpStatus } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { Response } from 'express';
import { Observable, from, of, switchMap } from 'rxjs';
import { AuthUser } from '../auth/auth.guard';
import { ApiError } from '../common/http-error';
import { getDb } from '../db/database';
import { idempotencyKeys } from '../db/schema';

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
    const db = getDb();

    return from(
      db
        .select()
        .from(idempotencyKeys)
        .where(
          and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.key, key)),
        ),
    ).pipe(
      switchMap((existing) => {
        if (existing[0]) {
          response.status(HttpStatus.CREATED);
          return of(existing[0].responseBody);
        }

        return next.handle().pipe(
          switchMap((body) =>
            from(
              db.insert(idempotencyKeys).values({
                userId,
                key,
                reservationId:
                  body && typeof body === 'object' && 'id' in body
                    ? String((body as { id: string }).id)
                    : null,
                responseBody: body as object,
              }),
            ).pipe(
              switchMap(() => {
                response.status(HttpStatus.CREATED);
                return of(body);
              }),
            ),
          ),
        );
      }),
    );
  }
}
