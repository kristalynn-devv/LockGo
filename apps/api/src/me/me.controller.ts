import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { eq } from 'drizzle-orm';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { getDb } from '../db/database';
import { customers, users } from '../db/schema';

@ApiTags('me')
@ApiBearerAuth()
@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  async me(@CurrentUser() user: AuthUser) {
    const db = getDb();
    const [customerRow, staffRow] = await Promise.all([
      db
        .select({ displayName: customers.displayName })
        .from(customers)
        .where(eq(customers.id, user.id)),
      db.select({ role: users.role }).from(users).where(eq(users.id, user.id)),
    ]);

    return {
      id: user.id,
      email: user.email ?? null,
      role: staffRow[0]?.role ?? 'user',
      display_name: customerRow[0]?.displayName ?? null,
    };
  }
}
