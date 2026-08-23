import { resolveOrigin } from '../locations';
import { Size } from './availability';
import { ListLockersQuery } from './dto/list-lockers.query';

const SIZES: Size[] = ['Small', 'Medium', 'Large'];

export type LockerSort = 'nearest' | 'price' | 'available';

export type LockerFilterRow = {
  name: string;
  address: string;
  distance_km: number | null;
  available: Record<Size, number>;
  starting_price: number;
  status: string;
};

export function isSearchableStation(status: string) {
  return status === 'Open';
}

export function matchesLockerFilters(row: LockerFilterRow, query: ListLockersQuery) {
  if (
    query.location &&
    !resolveOrigin(query.location) &&
    !row.name.toLowerCase().includes(query.location.toLowerCase()) &&
    !row.address.toLowerCase().includes(query.location.toLowerCase())
  ) {
    return false;
  }
  if (query.distance != null && row.distance_km != null) {
    if (row.distance_km > query.distance) {
      return false;
    }
  }
  if (query.size && row.available[query.size] === 0) {
    return false;
  }
  if (query.price != null && row.starting_price > query.price) {
    return false;
  }
  if (query.available_only) {
    const total = SIZES.reduce((sum, size) => sum + row.available[size], 0);
    if (total === 0) {
      return false;
    }
  }
  return true;
}

function availableTotal(row: LockerFilterRow) {
  return SIZES.reduce((sum, size) => sum + row.available[size], 0);
}

export function sortLockers<T extends LockerFilterRow>(
  rows: T[],
  sort: LockerSort = 'nearest',
) {
  return [...rows].sort((left, right) => {
    if (sort === 'price') {
      return (
        left.starting_price - right.starting_price ||
        (left.distance_km ?? Number.POSITIVE_INFINITY) -
          (right.distance_km ?? Number.POSITIVE_INFINITY)
      );
    }
    if (sort === 'available') {
      return (
        availableTotal(right) - availableTotal(left) ||
        (left.distance_km ?? Number.POSITIVE_INFINITY) -
          (right.distance_km ?? Number.POSITIVE_INFINITY)
      );
    }
    return (
      (left.distance_km ?? Number.POSITIVE_INFINITY) -
        (right.distance_km ?? Number.POSITIVE_INFINITY) ||
      left.name.localeCompare(right.name)
    );
  });
}
