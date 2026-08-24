import { HttpStatus, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { ApiError } from '../../common/http-error';
import { getDb, getSql } from '../../db/database';
import { dbEnv } from '../../db/env';
import { customers, users } from '../../db/schema';
import { CreateAdminCustomerDto } from './dto/create-admin-customer.dto';
import { ListAdminCustomersQuery } from './dto/list-admin-customers.query';
import { UpdateAdminCustomerDto } from './dto/update-admin-customer.dto';

type CustomerRow = {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  role: 'user' | 'admin';
  created_at: string;
};

@Injectable()
export class AdminCustomersService {
  async list(query: ListAdminCustomersQuery) {
    const sql = getSql();
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const search = query.q?.trim();

    const rows = search
      ? await sql<CustomerRow[]>`
          SELECT
            c.id,
            u.email,
            c.display_name,
            c.status,
            CASE WHEN s.id IS NOT NULL THEN 'admin'::text ELSE 'user'::text END AS role,
            c.created_at
          FROM public.customers c
          INNER JOIN auth.users u ON u.id = c.id
          LEFT JOIN public.users s ON s.id = c.id
          WHERE
            u.email ILIKE ${'%' + search + '%'}
            OR c.display_name ILIKE ${'%' + search + '%'}
          ORDER BY c.created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `
      : await sql<CustomerRow[]>`
          SELECT
            c.id,
            u.email,
            c.display_name,
            c.status,
            CASE WHEN s.id IS NOT NULL THEN 'admin'::text ELSE 'user'::text END AS role,
            c.created_at
          FROM public.customers c
          INNER JOIN auth.users u ON u.id = c.id
          LEFT JOIN public.users s ON s.id = c.id
          ORDER BY c.created_at DESC
          LIMIT ${limit}
          OFFSET ${offset}
        `;

    const countRows = search
      ? await sql<{ n: number }[]>`
          SELECT count(*)::int AS n
          FROM public.customers c
          INNER JOIN auth.users u ON u.id = c.id
          WHERE
            u.email ILIKE ${'%' + search + '%'}
            OR c.display_name ILIKE ${'%' + search + '%'}
        `
      : await sql<{ n: number }[]>`
          SELECT count(*)::int AS n FROM public.customers
        `;

    const items = rows.map((row) => ({
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      status: row.status,
      role: row.role,
      created_at: new Date(row.created_at).toISOString(),
    }));

    return { items, page, limit, total: countRows[0]?.n ?? 0 };
  }

  async create(dto: CreateAdminCustomerDto) {
    const authUser = await this.createAuthUser(dto);
    if (dto.staff_role === 'admin') {
      await this.promoteToStaff(authUser.id, dto.display_name);
    }

    return {
      id: authUser.id,
      email: dto.email,
      display_name: dto.display_name,
      status: 'active',
      role: dto.staff_role === 'admin' ? ('admin' as const) : ('user' as const),
      password: dto.password,
    };
  }

  async update(id: string, dto: UpdateAdminCustomerDto) {
    await this.findCustomer(id);
    const db = getDb();

    if (dto.display_name != null || dto.status != null) {
      const values: Partial<typeof customers.$inferInsert> = {};
      if (dto.display_name != null) values.displayName = dto.display_name;
      if (dto.status != null) values.status = dto.status;
      values.updatedAt = new Date();

      await db.update(customers).set(values).where(eq(customers.id, id));
    }

    if (dto.staff_role === 'admin') {
      const [row] = await db
        .select({ displayName: customers.displayName })
        .from(customers)
        .where(eq(customers.id, id));
      await this.promoteToStaff(id, row?.displayName ?? dto.display_name ?? 'Staff');
    } else if (dto.staff_role === 'none') {
      await db.delete(users).where(eq(users.id, id));
    }

    return this.detail(id);
  }

  async detail(id: string) {
    const sql = getSql();
    const rows = await sql<CustomerRow[]>`
      SELECT
        c.id,
        u.email,
        c.display_name,
        c.status,
        CASE WHEN s.id IS NOT NULL THEN 'admin'::text ELSE 'user'::text END AS role,
        c.created_at
      FROM public.customers c
      INNER JOIN auth.users u ON u.id = c.id
      LEFT JOIN public.users s ON s.id = c.id
      WHERE c.id = ${id}::uuid
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Customer not found');
    }
    return {
      id: row.id,
      email: row.email,
      display_name: row.display_name,
      status: row.status,
      role: row.role,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  async remove(id: string) {
    await this.findCustomer(id);
    const sql = getSql();

    const reservationRows = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM public.reservations WHERE user_id = ${id}::uuid
    `;
    if ((reservationRows[0]?.n ?? 0) > 0) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'HAS_RESERVATIONS',
        'Cannot delete a user with reservations',
      );
    }

    const response = await fetch(`${dbEnv.supabaseUrl}/auth/v1/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        apikey: dbEnv.serviceRoleKey,
        Authorization: `Bearer ${dbEnv.serviceRoleKey}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      throw new ApiError(
        HttpStatus.BAD_GATEWAY,
        'AUTH_DELETE_FAILED',
        'Failed to delete auth user',
      );
    }

    return { ok: true };
  }

  private async findCustomer(id: string) {
    const db = getDb();
    const [row] = await db.select().from(customers).where(eq(customers.id, id));
    if (!row) {
      throw new ApiError(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Customer not found');
    }
    return row;
  }

  private async promoteToStaff(id: string, displayName: string) {
    const sql = getSql();
    await sql`
      INSERT INTO public.users (id, display_name, role)
      VALUES (${id}::uuid, ${displayName}, 'admin')
      ON CONFLICT (id) DO UPDATE
        SET display_name = EXCLUDED.display_name, role = 'admin'
    `;
  }

  private async createAuthUser(dto: CreateAdminCustomerDto) {
    const response = await fetch(`${dbEnv.supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: dbEnv.serviceRoleKey,
        Authorization: `Bearer ${dbEnv.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: dto.email,
        password: dto.password,
        email_confirm: true,
        user_metadata: { full_name: dto.display_name },
      }),
    });

    if (response.ok) {
      return (await response.json()) as { id: string };
    }

    const body = await response.text();
    if (response.status === 422 && body.includes('already been registered')) {
      throw new ApiError(
        HttpStatus.CONFLICT,
        'EMAIL_EXISTS',
        'A user with that email already exists',
      );
    }

    throw new ApiError(
      HttpStatus.BAD_GATEWAY,
      'AUTH_CREATE_FAILED',
      'Failed to create auth user',
    );
  }
}
