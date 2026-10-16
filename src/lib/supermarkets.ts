import { SUPERMARKETS, type Supermarket } from "@/content/supermarkets";
import { drivingMinutesFrom, haversineKm, roadKmFrom, type Origin } from "@/lib/geo";

export type { Supermarket } from "@/content/supermarkets";

export interface SupermarketDistance {
  distanceKm: number;
  straightLineKm: number;
  drivingMinutes: number;
}

export type SupermarketWithDistance = Supermarket & SupermarketDistance;

/**
 * The closest entry in {@link SUPERMARKETS} to a given home, or null when the
 * list is empty. Ties break on list order.
 */
export function nearestSupermarket(
  origin: Origin,
): SupermarketWithDistance | null {
  let best: SupermarketWithDistance | null = null;
  for (const supermarket of SUPERMARKETS) {
    const straightLineKm =
      Math.round(haversineKm(origin, supermarket) * 10) / 10;
    if (best === null || straightLineKm < best.straightLineKm) {
      const distanceKm = roadKmFrom(straightLineKm);
      best = {
        ...supermarket,
        straightLineKm,
        distanceKm,
        drivingMinutes: drivingMinutesFrom(distanceKm),
      };
    }
  }
  return best;
}
