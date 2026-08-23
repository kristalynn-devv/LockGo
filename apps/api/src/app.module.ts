import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LockersModule } from './lockers/lockers.module';
import { MeModule } from './me/me.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [LockersModule, ReservationsModule, MeModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
