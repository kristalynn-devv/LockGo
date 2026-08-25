import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { ApiError } from '../common/http-error';
import { AdminGuard } from './admin.guard';
import { adminRoleCache } from './auth-cache';

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
    adminRoleCache.clear();
  });

  it('rejects a request with no authenticated user', async () => {
    // ต้องผ่าน AuthGuard ก่อน — ไม่มี user บน request ได้ 401
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
    // ล็อกอินแล้วแต่ไม่มีแถวใน users/staff — ไม่ใช่แอดมิน
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
    // role อื่น เช่น support — ห้ามเข้า /admin/*
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
    // admin ที่ถูกปิดใช้งาน — 403 แม้ role ถูกต้อง
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
    // role=admin และ status=active — ผ่าน guard
    whereMock.mockResolvedValue([{ role: 'admin', status: 'active' }]);
    const guard = new AdminGuard();

    await expect(
      guard.canActivate(httpContext({ id: 'carol' })),
    ).resolves.toBe(true);
  });
});
