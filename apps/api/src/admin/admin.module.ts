import { Module } from '@nestjs/common';
import { AdminCustomersController } from './customers/admin-customers.controller';
import { AdminCustomersService } from './customers/admin-customers.service';
import { AdminPaymentsController } from './payments/admin-payments.controller';
import { AdminPaymentsService } from './payments/admin-payments.service';
import { AdminReservationsController } from './reservations/admin-reservations.controller';
import { AdminReservationsService } from './reservations/admin-reservations.service';
import { AdminStationsController } from './stations/admin-stations.controller';
import { AdminStationsService } from './stations/admin-stations.service';
import { AdminSummaryController } from './summary/admin-summary.controller';
import { AdminSummaryService } from './summary/admin-summary.service';

@Module({
  controllers: [
    AdminStationsController,
    AdminReservationsController,
    AdminPaymentsController,
    AdminCustomersController,
    AdminSummaryController,
  ],
  providers: [
    AdminStationsService,
    AdminReservationsService,
    AdminPaymentsService,
    AdminCustomersService,
    AdminSummaryService,
  ],
})
export class AdminModule {}
