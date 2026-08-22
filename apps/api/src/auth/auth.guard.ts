import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { ApiError } from '../common/http-error';
import { dbEnv } from '../db/env';

export type AuthUser = {
  id: string;
  email?: string;
};

@Injectable()
export class AuthGuard implements CanActivate {
  private client: SupabaseClient | undefined;

  private supabase() {
    if (!this.client) {
      this.client = createClient(dbEnv.supabaseUrl, dbEnv.serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
    return this.client;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (!token) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Missing access token',
      );
    }

    const { data, error } = await this.supabase().auth.getUser(token);
    if (error || !data.user) {
      throw new ApiError(
        HttpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'Invalid access token',
      );
    }

    request.user = { id: data.user.id, email: data.user.email };
    return true;
  }
}
