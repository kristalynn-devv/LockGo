import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminReservationsService } from './admin-reservations.service';
import { ListAdminReservationsQuery } from './dto/list-admin-reservations.query';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/reservations')
@UseGuards(AuthGuard, AdminGuard)
export class AdminReservationsController {
  constructor(private readonly reservations: AdminReservationsService) {}

  @Get()
  list(@Query() query: ListAdminReservationsQuery) {
    return this.reservations.list(query);
  }
}
