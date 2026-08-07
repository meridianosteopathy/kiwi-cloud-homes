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
    const km = Math.round(haversineKm(origin, { lat: school.lat, lng: school.lng }) * 10) / 10;
    return { distanceKm: km, zone: zoneForDistance(km) };
  }
  if (sameOrigin(origin, SNAPSHOT_ORIGIN)) {
    return { distanceKm: school.distanceKm, zone: school.zone };
  }
  return null;
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
    if (d && d.distanceKm <= maxKm) out.push({ ...school, ...d });
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

