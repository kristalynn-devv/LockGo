import {
  isSearchableStation,
  matchesLockerFilters,
  sortLockers,
} from './locker-filters';
import type { LockerFilterRow } from './locker-filters';

function station(overrides: Partial<LockerFilterRow> = {}): LockerFilterRow {
  return {
    name: 'LockGo Central Station',
    address: '13 Si Lom, Bang Rak, Bangkok 10500',
    distance_km: 0.4,
    available: { Small: 4, Medium: 3, Large: 2 },
    starting_price: 30,
    status: 'Open',
    ...overrides,
  };
}

describe('locker filters', () => {
  it('AC-08 keeps a station at the starting-price ceiling', () => {
    // ตัวกรอง price = เพดานราคาเริ่มต้น max(rate×1, 30) — 30 ตรงเพดานผ่าน
    expect(matchesLockerFilters(station({ starting_price: 30 }), { price: 30 })).toBe(
      true,
    );
  });

  it('AC-08 drops a station above the starting-price ceiling', () => {
    // starting_price 45 > เพดาน 30 — ตัดออกจากผลค้นหา
    expect(matchesLockerFilters(station({ starting_price: 45 }), { price: 30 })).toBe(
      false,
    );
  });

  it('AC-08 drops a station beyond the distance limit', () => {
    // กรอง distance — 6 km เกินเพดาน 5 km
    expect(matchesLockerFilters(station({ distance_km: 6 }), { distance: 5 })).toBe(
      false,
    );
  });

  it('AC-08 drops a station with no free compartment of the selected size', () => {
    // เลือก Medium แต่ available.Medium = 0 — ไม่แสดง
    expect(
      matchesLockerFilters(station({ available: { Small: 2, Medium: 0, Large: 1 } }), {
        size: 'Medium',
      }),
    ).toBe(false);
  });

  it('AC-08 keeps a station that still has a free compartment when available_only', () => {
    // U-05 — available_only หมายถึงมีช่องว่างตามโหมดปัจจุบัน
    expect(matchesLockerFilters(station(), { available_only: true })).toBe(true);
  });

  it('AC-08 drops a station with no free compartments when available_only', () => {
    // S/M/L ว่างหมด — ตัดออกเมื่อเปิด available_only
    expect(
      matchesLockerFilters(
        station({ available: { Small: 0, Medium: 0, Large: 0 } }),
        { available_only: true },
      ),
    ).toBe(false);
  });

  it('AC-09 lists only Open stations', () => {
    // BR-08 / U-04 — สถานี Open เท่านั้นที่ค้นหาและจองได้
    expect(isSearchableStation('Open')).toBe(true);
  });

  it('AC-09 hides a Maintenance station', () => {
    // ตู้ซ่อมบำรุง — ไม่ปรากฏในผล
    expect(isSearchableStation('Maintenance')).toBe(false);
  });

  it('AC-09 hides a Closed station', () => {
    // ตู้ปิด — ไม่ปรากฏในผล
    expect(isSearchableStation('Closed')).toBe(false);
  });

  it('returns no rows when no station matches the filters', () => {
    // AC-21 — ไม่มีตู้ตรงเงื่อนไข คืนรายการว่าง
    const items = [
      station({ name: 'LockGo Asok', distance_km: 8, starting_price: 30 }),
    ].filter((row) =>
      matchesLockerFilters(row, { location: 'nowhere-place', distance: 1, price: 20 }),
    );

    expect(items).toEqual([]);
  });

  it('FR-04 sorts nearest first', () => {
    // เรียง nearest — distance_km น้อยกว่าขึ้นก่อน
    const ordered = sortLockers(
      [
        station({ name: 'Far', distance_km: 8 }),
        station({ name: 'Near', distance_km: 0.4 }),
      ],
      'nearest',
    );
    expect(ordered.map((row) => row.name)).toEqual(['Near', 'Far']);
  });

  it('FR-04 sorts lowest starting price first', () => {
    // เรียง price — starting_price ต่ำกว่าขึ้นก่อน
    const ordered = sortLockers(
      [
        station({ name: 'Ari', starting_price: 45 }),
        station({ name: 'Central', starting_price: 30 }),
      ],
      'price',
    );
    expect(ordered.map((row) => row.name)).toEqual(['Central', 'Ari']);
  });

  it('FR-04 sorts most free compartments first', () => {
    // เรียง available — รวม S+M+L มากกว่าขึ้นก่อน
    const ordered = sortLockers(
      [
        station({
          name: 'Tight',
          available: { Small: 0, Medium: 1, Large: 0 },
        }),
        station({
          name: 'Open',
          available: { Small: 4, Medium: 3, Large: 2 },
        }),
      ],
      'available',
    );
    expect(ordered.map((row) => row.name)).toEqual(['Open', 'Tight']);
  });
});
