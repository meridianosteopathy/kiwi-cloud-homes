/** A point on the map — a home, a school, a supermarket. */
export interface Origin {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle ("as the crow flies") distance in km between two points. */
export function haversineKm(a: Origin, b: Origin): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Straight-line distance understates the drive: streets bend, waterways and
 * rail corridors force detours, and one-ways add blocks. Guests check our
 * numbers against Google Maps, which quotes road distance, so showing the raw
 * crow-flies figure reads as simply wrong.
 *
 * 1.3 is the usual circuity ratio for a city laid out like Christchurch (see
 * the schools importer, where it was tuned against a known Halswell → Burnside
 * High example). It's an estimate, not a route.
 */
export const ROAD_DETOUR_FACTOR = 1.3;

/** Rounds a straight-line km figure into the estimated road-distance km shown to guests. */
export function roadKmFrom(straightLineKm: number): number {
  return Math.round(straightLineKm * ROAD_DETOUR_FACTOR * 10) / 10;
}

// Rough urban estimate — good enough for "give me a feel" without a routing
// API. ~40 km/h in Christchurch traffic, same figure SchoolMatch uses for
// driving times.
const DRIVING_MIN_PER_KM = 1.5;

/** Estimated driving minutes for a road-distance km figure (from {@link roadKmFrom}). */
export function drivingMinutesFrom(roadKm: number): number {
  return Math.max(1, Math.round(roadKm * DRIVING_MIN_PER_KM));
}
