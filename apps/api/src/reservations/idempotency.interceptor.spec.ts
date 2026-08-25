import { CallHandler, ExecutionContext, HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http-error';
import {
  IdempotencyInterceptor,
  runExclusive,
} from './idempotency.interceptor';

function httpContext() {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, user: { id: 'alice' } }),
      getResponse: () => ({ status: () => undefined }),
    }),
  } as unknown as ExecutionContext;
}

describe('IdempotencyInterceptor', () => {
  it('AC-22 rejects POST /reservations without Idempotency-Key', () => {
    // S-05 / BR-05 — กดยืนยันซ้ำต้องไม่สร้างจองซ้ำ จึงบังคับ Idempotency-Key
    const interceptor = new IdempotencyInterceptor();

    try {
      interceptor.intercept(httpContext(), { handle: () => undefined } as CallHandler);
      throw new Error('expected IDEMPOTENCY_KEY_REQUIRED');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect((error as ApiError).getResponse()).toMatchObject({
        code: 'IDEMPOTENCY_KEY_REQUIRED',
      });
    }
  });

  it('runs the same user+key callback one at a time', async () => {
    const locks = new Map<string, Promise<void>>();
    let concurrent = 0;
    let maxConcurrent = 0;
    let created = 0;

    async function attempt() {
      return runExclusive(
        'alice',
        'same-key',
        async () => {
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise((resolve) => setTimeout(resolve, 20));
          created += 1;
          concurrent -= 1;
          return created;
        },
        locks,
      );
    }

    const [first, second] = await Promise.all([attempt(), attempt()]);

    expect(maxConcurrent).toBe(1);
    expect(first).toBe(1);
    expect(second).toBe(2);
  });
});
