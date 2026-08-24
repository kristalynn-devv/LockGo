import { Module, OnModuleDestroy } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { closeDb } from './db/database';
import { LockersModule } from './lockers/lockers.module';
import { MeModule } from './me/me.module';
import { ReservationsModule } from './reservations/reservations.module';

@Module({
  imports: [LockersModule, ReservationsModule, MeModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleDestroy {
  async onModuleDestroy() {
    await closeDb();
  }
}
