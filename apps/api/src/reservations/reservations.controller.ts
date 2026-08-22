import { Body, Controller, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard, type AuthUser } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
@UseGuards(AuthGuard)
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  create(@CurrentUser() user: AuthUser, @Body() body: CreateReservationDto) {
    return this.reservations.create(user.id, body);
  }
}
