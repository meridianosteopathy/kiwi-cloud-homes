export interface LocalizedName {
  zhCN: string;
  en: string;
}

export type ZoneStatus = "in-zone" | "nearby" | "further" | "out-of-region";

export interface Region {
  id: string;
  name: LocalizedName;
}

export interface City {
  id: string;
  regionId: string;
  name: LocalizedName;
}

export interface District {
  id: string;
  cityId: string;
  regionId: string;
  name: LocalizedName;
}

export interface School {
  id: string;
  districtId: string;
  cityId: string;
  regionId: string;
  name: LocalizedName;
  /** Approx straight-line distance from the property, km. */
  distanceKm: number;
  zone: ZoneStatus;
}
