/**
 * Per-home settings the host edits by hand.
 *
 * Hostaway holds the bookable facts for each house — price, calendar, photos,
 * amenities, bed counts. This file holds the few things Hostaway has nowhere
 * to put:
 *
 *   - the Mandarin description (Hostaway stores only one description per
 *     listing, usually the English copy)
 *   - the 360° tour URL
 *   - the map coordinates, which the /school page uses to work out how far
 *     each school is from that particular house
 *
 * ────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A HOUSE
 * ────────────────────────────────────────────────────────────────────────
 * The house itself only needs to exist in Hostaway — the website picks it up
 * automatically and it becomes bookable straight away. You only come here to
 * give it Chinese copy, a tour link, or school distances.
 *
 *   1. Find the listing id: open the house in the Hostaway dashboard and look
 *      at the address bar — .../listings/123456 → the id is 123456.
 *   2. Copy one of the blocks below, paste it at the end of the list.
 *   3. Put the id in `match`. (The listing's name works too, but the id never
 *      changes when you rename the house, so prefer the id.)
 *   4. Fill in what you have. Anything you leave out just falls back to what
 *      Hostaway returns — nothing breaks.
 *   5. Commit + push + merge.
 *
 * To find a house's coordinates: open Google Maps, right-click the house,
 * click the numbers at the top of the menu (that copies them), and paste —
 * you get `-43.5788, 172.5620`, which is `lat` then `lng`.
 */

export interface HomeCoordinates {
  lat: number;
  lng: number;
}

export interface HomeProfile {
  /** Internal label — only ever seen by you, in this file. */
  key: string;
  /**
   * Hostaway listing ids (preferred) and/or listing names that identify this
   * house. Names are matched case- and space-insensitively.
   */
  match: string[];
  /**
   * Where the house is. Used to compute distance, walking and driving time to
   * each school on the /school page. Leave it out and that house simply shows
   * no school distances — everything else about it still works.
   */
  coordinates?: HomeCoordinates;
  /** Locale overrides for the description. Empty/missing → Hostaway's copy. */
  description?: Partial<Record<"zh-CN" | "en", string>>;
  /**
   * 360° virtual tour URL — paste the EMBED URL the tour provider gives you.
   *
   *   - Matterport: https://my.matterport.com/show/?m=YOUR-TOUR-ID
   *   - Kuula:      https://kuula.co/share/collection/YOUR-ID
   *   - YouTube:    https://www.youtube.com/embed/YOUR-VIDEO-ID
   *
   * Leave empty to hide the "360° Tour" button on that house's card.
   */
  tourUrl?: string;
}

export const HOMES: HomeProfile[] = [
  {
    key: "halswell",
    // Hostaway 384499 — "Modern Home: 2 Ensuites, 17 Min to City & CHC Air".
    // The trailing entry is the mock client's id, so `HOSTAWAY_USE_MOCK=true`
    // local runs get this copy too.
    match: ["384499", "mock-halswell"],
    coordinates: { lat: -43.5788, lng: 172.562 },
    description: {
      "zh-CN":
        "位于基督城西南区 Halswell 的明亮四居室家庭住宅,Cashmere High 与 Halswell School 学区内。开车前往 Riccarton、市中心 (CBD) 与 Lincoln 都很便利。\n\n房屋专为中长期入住设计:完整厨房与餐厅、独立办公区、舒适沙发、安静的卧室,以及高速 Wi-Fi、洗衣机、烘干机、暖气、热泵齐全。后院与花园适合带孩子放松,免费停车位充足。\n\n房东本地居住,沟通方便:看校、就医、生活采购、附近活动推荐,都可随时联系。",
      // en: undefined → keep the Hostaway-returned English description.
    },
    // Hidden until we have a real Matterport / Kuula scan for this property.
    tourUrl: "",
  },
  {
    key: "bealey-ave",
    // Hostaway 576705 — "Super king bed & free parking, central CHC".
    // Unit 12 / 106 Bealey Avenue, Christchurch Central, Christchurch 8013.
    match: ["576705", "mock-riccarton"],
    // APPROXIMATE — estimated from the street address, not measured, so it
    // may be a few hundred metres out along Bealey Avenue. To correct it:
    // Google Maps → right-click the building → click the numbers at the top
    // of the menu to copy → paste them here as lat, lng.
    coordinates: { lat: -43.5218, lng: 172.6342 },
    description: {
      // TODO(host): Mandarin copy for this home. While this is empty, Chinese
      // visitors see Hostaway's English description for it.
      "zh-CN": "",
    },
    tourUrl: "",
  },
];

/** Lowercase, trim, collapse inner whitespace — so " Halswell  Garden " matches. */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface HomeIdentity {
  id: string;
  name: string;
}

/**
 * Finds the profile for a Hostaway listing, by id first and then by name.
 * Returns undefined for a house that hasn't been given a block above — which
 * is a normal state, not an error.
 */
export function homeProfileFor(
  listing: HomeIdentity,
): HomeProfile | undefined {
  const id = normalize(listing.id);
  const name = normalize(listing.name);
  return HOMES.find((home) =>
    home.match.some((m) => {
      const key = normalize(m);
      return key === id || key === name;
    }),
  );
}

export function resolveDescription(
  listing: HomeIdentity,
  locale: string,
  fallback: string,
): string {
  const profile = homeProfileFor(listing);
  const override =
    profile?.description?.[locale === "zh-CN" ? "zh-CN" : "en"];
  return override && override.trim().length > 0 ? override : fallback;
}

export function resolveTourUrl(
  listing: HomeIdentity,
  fallback: string | undefined,
): string | null {
  const override = homeProfileFor(listing)?.tourUrl;
  const value = override && override.trim().length > 0 ? override : fallback;
  return value && value.trim().length > 0 ? value : null;
}

/**
 * Map position for a listing, or null when it hasn't been filled in above.
 * Null means "no school distances for this house yet", never a wrong number.
 */
export function homeCoordinates(
  listing: HomeIdentity,
): HomeCoordinates | null {
  return homeProfileFor(listing)?.coordinates ?? null;
}

/**
 * The slice of a home that the school-page client components need. Kept small
 * and plain so it crosses the server/client boundary as props.
 */
export interface HomeSummary {
  listingId: string;
  name: string;
  coordinates: HomeCoordinates | null;
}

export function homeSummary(listing: HomeIdentity): HomeSummary {
  return {
    listingId: listing.id,
    name: listing.name,
    coordinates: homeCoordinates(listing),
  };
}
