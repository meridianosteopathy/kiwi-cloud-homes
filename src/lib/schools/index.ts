import { CITIES, DISTRICTS, RADIUS_KM, REGIONS, SCHOOLS } from "./data";
import type { City, District, Region, School } from "./types";

export type { City, District, LocalizedName, Region, School, ZoneStatus } from "./types";
export { CITIES, DISTRICTS, RADIUS_KM, REGIONS, SCHOOLS } from "./data";

/**
 * Schools within {@link RADIUS_KM} of the home, sorted nearest first.
 */
export function nearbySchools(maxKm: number = RADIUS_KM): School[] {
  return SCHOOLS.filter((s) => s.distanceKm <= maxKm).sort(
    (a, b) => a.distanceKm - b.distanceKm,
  );
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

