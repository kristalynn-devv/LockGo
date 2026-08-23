import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminStationsService } from './admin-stations.service';
import { CreateCompartmentDto } from './dto/create-compartment.dto';
import { CreateStationDto } from './dto/create-station.dto';
import { ListAdminStationsQuery } from './dto/list-admin-stations.query';
import { UpdateStationDto } from './dto/update-station.dto';
import { UpsertPricingDto } from './dto/upsert-pricing.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/stations')
@UseGuards(AuthGuard, AdminGuard)
export class AdminStationsController {
  constructor(private readonly stations: AdminStationsService) {}

  @Get()
  list(@Query() query: ListAdminStationsQuery) {
    return this.stations.list(query);
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.stations.detail(id);
  }

  @Post()
  create(@Body() dto: CreateStationDto) {
    return this.stations.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateStationDto) {
    return this.stations.update(id, dto);
  }

  @Post(':id/compartments')
  addCompartment(@Param('id') id: string, @Body() dto: CreateCompartmentDto) {
    return this.stations.addCompartment(id, dto);
  }

  @Put(':id/pricing/:size')
  upsertPricing(
    @Param('id') id: string,
    @Param('size') size: 'Small' | 'Medium' | 'Large',
    @Body() dto: UpsertPricingDto,
  ) {
    return this.stations.upsertPricing(id, size, dto);
  }
}
