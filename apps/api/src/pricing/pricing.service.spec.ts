import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const pricing = new PricingService();

  it('uses the ฿30 floor for a cheap 1-hour booking', () => {
    expect(pricing.total(10, 1)).toBe(30);
  });

  it('matches the PRD Medium 4-hour example', () => {
    expect(pricing.total(15, 4)).toBe(60);
  });
});
