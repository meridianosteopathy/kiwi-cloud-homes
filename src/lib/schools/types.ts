export interface LocalizedName {
  zhCN: string;
  en: string;
}

export type ZoneStatus = "in-zone" | "nearby" | "further" | "out-of-region";

export type SchoolLevel =
  | "kindergarten"
  | "primary"
  | "intermediate"
  | "secondary";

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
  level: SchoolLevel;
  /**
   * Straight-line distance in km from {@link SNAPSHOT_ORIGIN} — the point the
   * importer centred this snapshot on. With more than one home on the site,
   * this is only the right number for the home that sits at that origin; use
   * {@link distanceFrom} to get the distance from a given home.
   */
  distanceKm: number;
  /** Zone status relative to {@link SNAPSHOT_ORIGIN}. See `distanceKm`. */
  zone: ZoneStatus;
  /**
   * School position, so distances can be computed from any home rather than
   * only from the snapshot origin. Optional because snapshots generated
   * before this field existed don't carry it — re-run
   * `npm run import:schools` to fill it in.
   */
  lat?: number;
  lng?: number;
}

/** A school paired with its distance from one particular home. */
export interface SchoolDistance {
  distanceKm: number;
  zone: ZoneStatus;
}

export type SchoolWithDistance = School & SchoolDistance;

/** Latitude/longitude of a home, used as the origin for school distances. */
export interface Origin {
  lat: number;
  lng: number;
}
