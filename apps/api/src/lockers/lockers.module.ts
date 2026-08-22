import { Module } from '@nestjs/common';
import { PricingService } from '../pricing/pricing.service';
import { LockersController } from './lockers.controller';
import { LockersService } from './lockers.service';

@Module({
  controllers: [LockersController],
  providers: [LockersService, PricingService],
})
export class LockersModule {}
