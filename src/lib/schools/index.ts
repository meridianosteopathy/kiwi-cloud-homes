import { CITIES, DISTRICTS, RADIUS_KM, REGIONS, SCHOOLS, SNAPSHOT_ORIGIN } from "./data";
import type {
  City,
  District,
  Origin,
  Region,
  School,
  SchoolDistance,
  SchoolWithDistance,
  ZoneStatus,
} from "./types";

export type {
  City,
  District,
  LocalizedName,
  Origin,
  Region,
  School,
  SchoolDistance,
  SchoolLevel,
  SchoolWithDistance,
  ZoneStatus,
} from "./types";
export {
  CITIES,
  DISTRICTS,
  RADIUS_KM,
  REGIONS,
  SCHOOLS,
  SNAPSHOT_ORIGIN,
} from "./data";

/**
 * Schools within {@link RADIUS_KM} of the snapshot origin, sorted nearest
 * first. Distances are measured from that origin — for a specific home, use
 * {@link schoolsNear}.
 */
export function nearbySchools(maxKm: number = RADIUS_KM): School[] {
  return SCHOOLS.filter((s) => s.distanceKm <= maxKm).sort(
    (a, b) => a.distanceKm - b.distanceKm,
  );
}

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance in km. Same formula the importer uses. */
function haversineKm(a: Origin, b: Origin): number {
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
 * Zone bands, matching the importer's. MoE doesn't publish catchment
 * polygons, so "in zone" is approximated from distance.
 */
function zoneForDistance(km: number): ZoneStatus {
  if (km <= 2) return "in-zone";
  if (km <= 10) return "nearby";
  if (km <= 20) return "further";
  return "out-of-region";
}

/** Two origins within ~100 m are treated as the same place. */
function sameOrigin(a: Origin, b: Origin): boolean {
  return haversineKm(a, b) < 0.1;
}

/**
 * Straight-line distance understates the drive: streets bend, the Avon and the
 * rail corridor force detours, and one-ways add blocks. Guests check our
 * numbers against Google Maps, which quotes road distance, so showing the raw
 * crow-flies figure reads as simply wrong — Halswell to Burnside High is 8.0 km
 * straight but 10.6 km by road.
 *
 * 1.3 is the usual circuity ratio for a city laid out like Christchurch, and
 * reproduces that example within a few hundred metres. It's an estimate, not a
 * route: the UI says so, and anyone booking around a tight commute should
 * check their own maps app.
 */
const ROAD_DETOUR_FACTOR = 1.3;

function roadKmFrom(straightLineKm: number): number {
  return Math.round(straightLineKm * ROAD_DETOUR_FACTOR * 10) / 10;
}

/**
 * Distance from one home to one school, or null when it can't be worked out.
 *
 * Null happens when the school snapshot predates per-school coordinates and
 * the home isn't the one the snapshot was centred on — re-running
 * `npm run import:schools` fills the coordinates in and resolves it. Callers
 * must render "not available" rather than substituting another home's number.
 */
export function distanceFrom(
  school: School,
  origin: Origin,
): SchoolDistance | null {
  if (typeof school.lat === "number" && typeof school.lng === "number") {
    const straightLineKm =
      Math.round(haversineKm(origin, { lat: school.lat, lng: school.lng }) * 10) / 10;
    return {
      distanceKm: roadKmFrom(straightLineKm),
      straightLineKm,
      zone: zoneForDistance(straightLineKm),
    };
  }
  if (sameOrigin(origin, SNAPSHOT_ORIGIN)) {
    // The snapshot's baked figure is straight-line, same as the computed one.
    return {
      distanceKm: roadKmFrom(school.distanceKm),
      straightLineKm: school.distanceKm,
      zone: school.zone,
    };
  }
  return null;
}

/**
 * The snapshot's own baked distance for a school, expressed the same way
 * {@link distanceFrom} expresses one. Used when no home has coordinates yet,
 * so the school list still ranks and reads consistently.
 */
export function snapshotDistance(school: School): SchoolDistance {
  return {
    distanceKm: roadKmFrom(school.distanceKm),
    straightLineKm: school.distanceKm,
    zone: school.zone,
  };
}

/**
 * Schools within `maxKm` of a given home, nearest first. Empty when the home
 * has no usable distance data (see {@link distanceFrom}).
 */
export function schoolsNear(
  origin: Origin,
  maxKm: number = RADIUS_KM,
): SchoolWithDistance[] {
  const out: SchoolWithDistance[] = [];
  for (const school of SCHOOLS) {
    const d = distanceFrom(school, origin);
    // Filter on straight-line distance so the radius keeps meaning the same
    // thing it does in the snapshot and in RADIUS_KM.
    if (d && d.straightLineKm <= maxKm) out.push({ ...school, ...d });
  }
  return out.sort((a, b) => a.distanceKm - b.distanceKm);
}

export type AppLocale = "zh-CN" | "en";

function localizedKey(locale: AppLocale): "zhCN" | "en" {
  return locale === "zh-CN" ? "zhCN" : "en";
}

export function localizedName(
  named: { name: { zhCN: string; en: string } },
  locale: AppLocale,
): string {
  return named.name[localizedKey(locale)];
}

export function findRegion(id: string): Region | undefined {
  return REGIONS.find((r) => r.id === id);
}

export function findCity(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

export function findDistrict(id: string): District | undefined {
  return DISTRICTS.find((d) => d.id === id);
}

export function findSchool(id: string): School | undefined {
  return SCHOOLS.find((s) => s.id === id);
}

