import { Municipality, MUNICIPALITIES } from '../data/municipalities';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestMunicipality(
  latitude: number,
  longitude: number,
): Municipality & { distanceKm: number } {
  let nearest = MUNICIPALITIES[0];
  let minDist = haversineKm(latitude, longitude, nearest.latitude, nearest.longitude);

  for (const m of MUNICIPALITIES.slice(1)) {
    const d = haversineKm(latitude, longitude, m.latitude, m.longitude);
    if (d < minDist) {
      minDist = d;
      nearest = m;
    }
  }

  return { ...nearest, distanceKm: Math.round(minDist * 10) / 10 };
}
