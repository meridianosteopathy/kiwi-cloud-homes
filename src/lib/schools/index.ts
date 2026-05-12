import { CITIES, DISTRICTS, REGIONS, SCHOOLS } from "./data";
import type { City, District, Region, School } from "./types";

export type { City, District, LocalizedName, Region, School, ZoneStatus } from "./types";
export { CITIES, DISTRICTS, REGIONS, SCHOOLS } from "./data";

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

export function citiesIn(regionId: string): City[] {
  return CITIES.filter((c) => c.regionId === regionId);
}

export function districtsIn(cityId: string): District[] {
  return DISTRICTS.filter((d) => d.cityId === cityId);
}

export function schoolsIn(districtId: string): School[] {
  return SCHOOLS.filter((s) => s.districtId === districtId);
}

/**
 * Case-insensitive substring search across school names in both locales.
 */
export function searchSchools(query: string, limit = 8): School[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SCHOOLS.filter(
    (s) =>
      s.name.en.toLowerCase().includes(q) ||
      s.name.zhCN.toLowerCase().includes(q),
  ).slice(0, limit);
}
