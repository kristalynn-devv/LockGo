import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../../auth/admin.guard';
import { AuthGuard } from '../../auth/auth.guard';
import { AdminCustomersService } from './admin-customers.service';
import { CreateAdminCustomerDto } from './dto/create-admin-customer.dto';
import { ListAdminCustomersQuery } from './dto/list-admin-customers.query';
import { UpdateAdminCustomerDto } from './dto/update-admin-customer.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin/customers')
@UseGuards(AuthGuard, AdminGuard)
export class AdminCustomersController {
  constructor(private readonly customers: AdminCustomersService) {}

  @Get()
  list(@Query() query: ListAdminCustomersQuery) {
    return this.customers.list(query);
  }

  @Post()
  create(@Body() dto: CreateAdminCustomerDto) {
    return this.customers.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminCustomerDto) {
    return this.customers.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customers.remove(id);
  }
}
