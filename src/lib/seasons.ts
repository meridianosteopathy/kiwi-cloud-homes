/**
 * NZ seasons (Southern Hemisphere) — the school-visit calendar context Chinese
 * families care about: Summer is peak (Feb intake prep + school holidays),
 * Autumn is quieter and good for visiting schools in session.
 */
export type SeasonId = "spring" | "summer" | "autumn" | "winter";
export type PriceBand = "low" | "medium" | "high" | "peak";
export type AvailabilityBand = "open" | "tight" | "very-tight";

export interface Season {
  id: SeasonId;
  /** 1-indexed months, e.g. spring = [9, 10, 11]. */
  months: number[];
  /** Default month a user lands on when they pick this season. */
  defaultMonth: number;
  priceBand: PriceBand;
  availabilityBand: AvailabilityBand;
}

export const SEASONS: Season[] = [
  {
    id: "spring",
    months: [9, 10, 11],
    defaultMonth: 9,
    priceBand: "medium",
    availabilityBand: "open",
  },
  {
    id: "summer",
    months: [12, 1, 2],
    defaultMonth: 12,
    priceBand: "peak",
    availabilityBand: "very-tight",
  },
  {
    id: "autumn",
    months: [3, 4, 5],
    defaultMonth: 3,
    priceBand: "medium",
    availabilityBand: "open",
  },
  {
    id: "winter",
    months: [6, 7, 8],
    defaultMonth: 6,
    priceBand: "low",
    availabilityBand: "open",
  },
];

export function findSeason(id: string | null | undefined): Season | undefined {
  if (!id) return undefined;
  return SEASONS.find((s) => s.id === id);
}

export function seasonForMonth(monthNum: number): Season | undefined {
  return SEASONS.find((s) => s.months.includes(monthNum));
}
