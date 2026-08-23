import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http-error';
import { AuthGuard } from './auth.guard';

function httpContext() {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: {} }),
    }),
  } as ExecutionContext;
}

describe('AuthGuard', () => {
  it('AC-07 rejects a request without a bearer token', async () => {
    const guard = new AuthGuard();

    try {
      await guard.canActivate(httpContext());
      throw new Error('expected UNAUTHORIZED');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect((error as ApiError).getResponse()).toMatchObject({
        code: 'UNAUTHORIZED',
      });
    }
  });
});
