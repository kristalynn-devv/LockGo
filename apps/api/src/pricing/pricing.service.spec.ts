import { PricingService } from './pricing.service';

describe('PricingService', () => {
  const pricing = new PricingService();

  it('AC-10 uses the ฿30 floor for a cheap 1-hour starting price', () => {
    // U-01 — ราคาเริ่มต้นอย่างน้อย ฿30 แม้เรท×ชม. ต่ำกว่า
    expect(pricing.total(10, 1)).toBe(30);
  });

  it('AC-11 matches the PRD Medium 4-hour example as ฿60', () => {
    // ตัวอย่าง PRD — Medium ฿15/ชม. × 4 ชม. = ฿60 (C-09 แยกเรทกับยอดรวม)
    expect(pricing.total(15, 4)).toBe(60);
  });
});
