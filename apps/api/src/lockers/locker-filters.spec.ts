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
    expect(matchesLockerFilters(station({ starting_price: 30 }), { price: 30 })).toBe(
      true,
    );
  });

  it('AC-08 drops a station above the starting-price ceiling', () => {
    expect(matchesLockerFilters(station({ starting_price: 45 }), { price: 30 })).toBe(
      false,
    );
  });

  it('AC-08 drops a station beyond the distance limit', () => {
    expect(matchesLockerFilters(station({ distance_km: 6 }), { distance: 5 })).toBe(
      false,
    );
  });

  it('AC-08 drops a station with no free compartment of the selected size', () => {
    expect(
      matchesLockerFilters(station({ available: { Small: 2, Medium: 0, Large: 1 } }), {
        size: 'Medium',
      }),
    ).toBe(false);
  });

  it('AC-08 keeps a station that still has a free compartment when available_only', () => {
    expect(matchesLockerFilters(station(), { available_only: true })).toBe(true);
  });

  it('AC-08 drops a station with no free compartments when available_only', () => {
    expect(
      matchesLockerFilters(
        station({ available: { Small: 0, Medium: 0, Large: 0 } }),
        { available_only: true },
      ),
    ).toBe(false);
  });

  it('AC-09 lists only Open stations', () => {
    expect(isSearchableStation('Open')).toBe(true);
  });

  it('AC-09 hides a Maintenance station', () => {
    expect(isSearchableStation('Maintenance')).toBe(false);
  });

  it('AC-09 hides a Closed station', () => {
    expect(isSearchableStation('Closed')).toBe(false);
  });

  it('returns no rows when no station matches the filters', () => {
    const items = [
      station({ name: 'LockGo Asok', distance_km: 8, starting_price: 30 }),
    ].filter((row) =>
      matchesLockerFilters(row, { location: 'nowhere-place', distance: 1, price: 20 }),
    );

    expect(items).toEqual([]);
  });

  it('FR-04 sorts nearest first', () => {
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
