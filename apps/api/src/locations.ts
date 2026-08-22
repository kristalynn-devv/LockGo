export type MockLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const MOCK_LOCATIONS: MockLocation[] = [
  {
    id: 'si-lom',
    name: 'Si Lom / Central Station',
    latitude: 13.7292,
    longitude: 100.5291,
  },
  {
    id: 'siam',
    name: 'Siam Square',
    latitude: 13.746,
    longitude: 100.534,
  },
  {
    id: 'asok',
    name: 'Asok',
    latitude: 13.7372,
    longitude: 100.5604,
  },
  {
    id: 'mo-chit',
    name: 'Mo Chit',
    latitude: 13.8024,
    longitude: 100.5534,
  },
  {
    id: 'on-nut',
    name: 'On Nut',
    latitude: 13.7056,
    longitude: 100.601,
  },
];

export function resolveOrigin(location?: string): MockLocation | undefined {
  if (!location) {
    return undefined;
  }
  const needle = location.trim().toLowerCase();
  return MOCK_LOCATIONS.find(
    (item) =>
      item.id === needle || item.name.toLowerCase().includes(needle),
  );
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
