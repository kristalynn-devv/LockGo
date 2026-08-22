import { Injectable } from '@nestjs/common';

export const MIN_TOTAL_PRICE = 30;

@Injectable()
export class PricingService {
  total(ratePerHour: number, durationHours: number): number {
    return Math.max(ratePerHour * durationHours, MIN_TOTAL_PRICE);
  }
}
