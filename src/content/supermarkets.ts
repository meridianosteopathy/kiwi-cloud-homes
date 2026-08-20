/**
 * Chinese/Asian supermarkets near our homes — hand-maintained, the same way
 * `homes.ts` holds the home coordinates: there's no import script for this
 * (unlike `src/lib/schools`, which is generated from an MoE data dump), so
 * add entries here as the host finds and confirms them.
 *
 * ────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A SUPERMARKET
 * ────────────────────────────────────────────────────────────────────────
 *   1. Open Google Maps, right-click the supermarket, click the numbers at
 *      the top of the menu (that copies them), and paste — you get
 *      `-43.5788, 172.5620`, which is `lat` then `lng`.
 *   2. Copy one of the blocks below, paste it at the end of the list.
 *   3. Commit + push + merge.
 *
 * The property card shows each home the single nearest entry in this list —
 * there's no per-home assignment to maintain, it's worked out from distance.
 */

export interface Supermarket {
  /** Internal label — only ever seen by you, in this file. */
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const SUPERMARKETS: Supermarket[] = [
  {
    id: "sunson-wigram",
    name: "Sunson Asian Food Market",
    address: "17 Lodestar Avenue, Wigram, Christchurch 8042",
    lat: -43.546991737458846,
    lng: 172.55885649325293,
  },
  {
    id: "xinxing-riccarton",
    name: "Xinxing Asian Market",
    address: "103 Riccarton Road, Riccarton, Christchurch 8041",
    lat: -43.52969298803746,
    lng: 172.60115313315663,
  },
];
