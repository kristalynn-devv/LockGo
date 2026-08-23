import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminSummaryService } from './admin-summary.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/summary')
@UseGuards(AuthGuard, AdminGuard)
export class AdminSummaryController {
  constructor(private readonly summary: AdminSummaryService) {}

  @Get()
  get() {
    return this.summary.summary();
  }
}
