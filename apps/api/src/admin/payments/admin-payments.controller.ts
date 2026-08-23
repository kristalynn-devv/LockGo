import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminPaymentsService } from './admin-payments.service';
import { ListAdminPaymentsQuery } from './dto/list-admin-payments.query';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/payments')
@UseGuards(AuthGuard, AdminGuard)
export class AdminPaymentsController {
  constructor(private readonly payments: AdminPaymentsService) {}

  @Get()
  list(@Query() query: ListAdminPaymentsQuery) {
    return this.payments.list(query);
  }
}
