import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ListLockersQuery } from './dto/list-lockers.query';
import { LockersService } from './lockers.service';

@ApiTags('lockers')
@ApiBearerAuth()
@Controller('lockers')
@UseGuards(AuthGuard)
export class LockersController {
  constructor(private readonly lockers: LockersService) {}

  @Get('locations')
  locations() {
    return { items: this.lockers.locations() };
  }

  @Get()
  list(@Query() query: ListLockersQuery) {
    return this.lockers.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string, @Query() query: ListLockersQuery) {
    return this.lockers.detail(id, query);
  }
}
