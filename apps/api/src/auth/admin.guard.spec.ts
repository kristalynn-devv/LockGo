import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http-error';
import { AdminGuard } from './admin.guard';

const whereMock = jest.fn();

jest.mock('../db/database', () => ({
  getDb: () => ({
    select: () => ({
      from: () => ({
        where: whereMock,
      }),
    }),
  }),
}));

function httpContext(user?: { id: string; email?: string }) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: {}, user }),
    }),
  } as ExecutionContext;
}

describe('AdminGuard', () => {
  beforeEach(() => {
    whereMock.mockReset();
  });

  it('rejects a request with no authenticated user', async () => {
    const guard = new AdminGuard();

    try {
      await guard.canActivate(httpContext(undefined));
      throw new Error('expected UNAUTHORIZED');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
      expect((error as ApiError).getResponse()).toMatchObject({
        code: 'UNAUTHORIZED',
      });
    }
  });

  it('rejects a user with no row in the staff table', async () => {
    whereMock.mockResolvedValue([]);
    const guard = new AdminGuard();

    try {
      await guard.canActivate(httpContext({ id: 'bob' }));
      throw new Error('expected FORBIDDEN');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect((error as ApiError).getResponse()).toMatchObject({
        code: 'FORBIDDEN',
      });
    }
  });

  it('rejects a staff row whose role is not admin', async () => {
    whereMock.mockResolvedValue([{ role: 'support', status: 'active' }]);
    const guard = new AdminGuard();

    try {
      await guard.canActivate(httpContext({ id: 'dave' }));
      throw new Error('expected FORBIDDEN');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect((error as ApiError).getResponse()).toMatchObject({
        code: 'FORBIDDEN',
      });
    }
  });

  it('rejects an admin whose status is inactive', async () => {
    whereMock.mockResolvedValue([{ role: 'admin', status: 'inactive' }]);
    const guard = new AdminGuard();

    try {
      await guard.canActivate(httpContext({ id: 'carol' }));
      throw new Error('expected FORBIDDEN');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect((error as ApiError).getResponse()).toMatchObject({
        code: 'FORBIDDEN',
      });
    }
  });

  it('allows an active staff row with role admin', async () => {
    whereMock.mockResolvedValue([{ role: 'admin', status: 'active' }]);
    const guard = new AdminGuard();

    await expect(
      guard.canActivate(httpContext({ id: 'carol' })),
    ).resolves.toBe(true);
  });
});
