import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { Request } from 'express';
import { ApiError } from '../common/http-error';
import { getDb } from '../db/database';
import { users } from '../db/schema';
import { AuthUser } from './auth.guard';

@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const user = request.user;
    if (!user) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Missing access token',
      );
    }

    const db = getDb();
    const [row] = await db
      .select({ role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, user.id));

    if (!row || row.role !== 'admin' || row.status !== 'active') {
      throw new ApiError(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Admin access required',
      );
    }

    return true;
  }
}
