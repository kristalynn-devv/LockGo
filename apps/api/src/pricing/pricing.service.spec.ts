import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const pricing = new PricingService();

  it('AC-10 uses the ฿30 floor for a cheap 1-hour starting price', () => {
    expect(pricing.total(10, 1)).toBe(30);
  });

  it('AC-11 matches the PRD Medium 4-hour example as ฿60', () => {
    expect(pricing.total(15, 4)).toBe(60);
  });
});
