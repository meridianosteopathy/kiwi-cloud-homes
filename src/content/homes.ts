/**
 * The homes shown on the site, and everything their property cards say.
 *
 * These details used to be fetched from Hostaway on every page view. The
 * houses now live in Hospitable, whose Essentials plan has no API, so the
 * site keeps its own copy here. The tourist and school pages render from this
 * file alone, so they keep working whatever a booking platform is doing.
 * Booking is by inquiry: guests send dates, the host confirms by email.
 *
 * ────────────────────────────────────────────────────────────────────────
 * HOW TO ADD A HOUSE
 * ────────────────────────────────────────────────────────────────────────
 *   1. Copy one of the blocks below, paste it at the end of the list.
 *   2. Give it a new `key` and fill in what you have. Optional fields you
 *      leave out are simply not shown — nothing breaks.
 *   3. Commit + push + merge.
 *
 * To find a house's coordinates: open Google Maps, right-click the house,
 * click the numbers at the top of the menu (that copies them), and paste —
 * you get `-43.5788, 172.5620`, which is `lat` then `lng`.
 */

import type { Amenity, ListingImage } from "@/lib/hostaway";

export interface HomeCoordinates {
  lat: number;
  lng: number;
}

export interface HomeProfile {
  /**
   * Stable id for the house: used in page links (#home-<key>) and inquiry
   * emails. Don't change it once the house is live.
   */
  key: string;
  /**
   * The house's old Hostaway listing ids and/or names. Pages identify homes
   * by `key`; these only matter to the leftover Hostaway booking code.
   */
  match: string[];
  /** Card heading, jump-link label and inquiry-email subject. */
  name: string;
  /** Shown under the name as "city · region". */
  address: { city: string; region: string };
  bedrooms: number;
  /** Leave out to hide the line rather than show a guess. */
  bathrooms?: number;
  /** "Sleeps up to N". Leave out to hide the line. */
  maxGuests?: number;
  /** Shortest stay the date picker allows. Leave out for no minimum. */
  minNights?: number;
  /**
   * Amenity names, matched against src/lib/amenities.ts for the icon and
   * Mandarin label (e.g. "Wifi", "Free parking on premises").
   */
  amenities?: string[];
  /**
   * Where the house is. Used to compute distance, walking and driving time to
   * each school on the /school page. Leave it out and that house simply shows
   * no school distances — everything else about it still works.
   */
  coordinates?: HomeCoordinates;
  /** English is required; a missing Mandarin entry falls back to it. */
  description: { en: string; "zh-CN"?: string };
  /**
   * Locale overrides for the bedroom-count line on the property card. Use
   * this when a single bedroom number doesn't tell guests enough —
   * e.g. a room count that mixes double, single and study rooms. Empty/
   * missing → the generic "{count} bedrooms" line.
   */
  bedroomsLabel?: Partial<Record<"zh-CN" | "en", string>>;
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
    name: "Modern Home: 2 Ensuites, 17 Min to City & CHC Air",
    address: { city: "Halswell, Christchurch", region: "Canterbury" },
    bedrooms: 2,
    // Both bathrooms are ensuites.
    bathrooms: 2,
    maxGuests: 5,
    amenities: [
      "Wifi",
      "Kitchen",
      "Washer",
      "Dryer",
      "Heating",
      "Heat pump",
      "Dedicated workspace",
      "Free parking on premises",
      "Garden",
    ],
    coordinates: { lat: -43.5788, lng: 172.562 },
    description: {
      // English is a translation of the host's Mandarin copy; the original
      // English lived in Hostaway.
      en: "Located in Halswell, southwest Christchurch, in zone for Cashmere High and Halswell School. It's an easy drive to Riccarton, the CBD and Lincoln.\n\nDesigned for medium and long stays: a full kitchen and dining area, a dedicated workspace, a comfortable sofa and quiet bedrooms, plus fast Wi-Fi, a washer, dryer, heating and a heat pump. The back garden is a relaxing space for kids, and there's plenty of free parking.\n\nThe host lives locally and is easy to reach: for school visits, doctors, shopping or local recommendations, just get in touch.",
      "zh-CN":
        "位于基督城西南区 Halswell, Cashmere High 与 Halswell School 学区内。开车前往 Riccarton、市中心 (CBD) 与 Lincoln 都很便利。\n\n房屋专为中长期入住设计:完整厨房与餐厅、独立办公区、舒适沙发、安静的卧室,以及高速 Wi-Fi、洗衣机、烘干机、暖气、热泵齐全。后院与花园适合带孩子放松,免费停车位充足。\n\n房东本地居住,沟通方便:看校、就医、生活采购、附近活动推荐,都可随时联系。",
    },
    // Hidden until we have a real Matterport / Kuula scan for this property.
    tourUrl: "",
    bedroomsLabel: {
      // The bedroom count (2) undersells the layout — there's also a single
      // bedroom and a study beyond the two ensuites. Spell that out so
      // guests don't read "2 bedrooms" as capacity for two.
      en: "2 double rooms, 1 single room, 1 study",
      "zh-CN": "2个双人房，1个单人房，一个书房",
    },
  },
  {
    key: "bealey-ave",
    // Hostaway 576705 — "Super king bed & free parking, central CHC".
    // Unit 12 / 106 Bealey Avenue, Christchurch Central, Christchurch 8013.
    match: ["576705", "mock-riccarton"],
    name: "Super king bed & free parking, central CHC",
    address: { city: "Christchurch Central", region: "Canterbury" },
    bedrooms: 2,
    // One main bathroom (not ensuite); the separate guest WC isn't counted.
    bathrooms: 1,
    maxGuests: 4,
    amenities: [
      "Kitchen",
      "Free parking on premises",
      "Patio or balcony",
    ],
    // APPROXIMATE — estimated from the street address, not measured, so it
    // may be a few hundred metres out along Bealey Avenue. To correct it:
    // Google Maps → right-click the building → click the numbers at the top
    // of the menu to copy → paste them here as lat, lng.
    coordinates: { lat: -43.5218, lng: 172.6342 },
    description: {
      // The host's Hostaway copy, minus its line routing guest questions to
      // the Airbnb app: a direct guest has no Airbnb thread, and the referral
      // pushes them back to a commission channel.
      en: "A two-storey townhouse on Bealey Avenue, on the quiet northern edge of the CBD. Six minutes' drive to Te Kaha stadium, 15 minutes' walk to Hagley Park, and your own off-street carpark — leave the car and walk or taxi into town.\n\nUpstairs: open-plan kitchen and living opening to a west-facing balcony. Downstairs: two double bedrooms, bathroom and a private courtyard.\n\nThe layout is upside-down in the best way — living upstairs, bedrooms down.\n\nUpstairs is open-plan: full kitchen, dining and lounge, with glass doors onto a west-facing balcony that catches the afternoon and evening sun. It's the natural spot for a drink before or after an event.\n\nDownstairs are two double bedrooms, both with built-in wardrobes, the main bathroom and the laundry. There's a separate guest WC, which matters when four people are getting ready at once. A private ground-floor courtyard sits off the back.\n\nThe whole place is about 70m² — easy to keep tidy, warm and neutral throughout, and genuinely quiet for a central address.\n\nYou have the entire townhouse to yourself, plus one allocated off-street carpark. Self check-in via keypad, so arrive whenever your travel or event schedule lands. The complex is small and residential — please keep noise down after 10pm in the shared driveway and courtyard areas.\n\nThe best way to reach me during your stay is through this site — send a message from your booking and I'll get back to you quickly. I'm local to Christchurch, so I can usually sort things out the same day.\n\nBealey Avenue is one of the four tree-lined avenues that frame the central city, so you're on the edge of everything without being in the middle of the noise.\n\nTe Kaha / One NZ Stadium — 6 min drive, 25–30 min walk\nHagley Park & Botanic Gardens — 15 min walk\nVictoria Street restaurants and bars — 5 min walk\nRiverside Market & The Crossing — 15 min walk\nChristchurch Hospital — 5 min drive\nMerivale shops and cafés — 5 min drive\n\nStreets here are flat and bike-friendly, and frequent bus routes run along Bealey and into the central exchange. On event days most guests drive in, park, and walk or grab a ride from there — the carpark is the reason this works.",
      "zh-CN":
        "位于 Bealey Avenue 的两层联排住宅,坐落在市中心 (CBD) 北缘,闹中取静。开车 6 分钟到 Te Kaha / One NZ 体育场,步行 15 分钟到 Hagley Park,并配有一个专属院内停车位——把车停好,步行或打车进城都很方便。\n\n户型是「颠倒」设计,而且恰到好处:起居在楼上,卧室在楼下。\n\n楼上为开放式厨房、餐厅与客厅,玻璃门通向朝西阳台,午后与傍晚阳光充足;看完比赛或演出回来,在这里小酌最为惬意。\n\n楼下是两间双人卧室,均配内嵌衣柜,另有主卫浴与洗衣区。特别设有独立客用洗手间——四人同时梳洗时,这一点格外实用。一层后侧还有一个私人小庭院。\n\n全屋约 70 平方米,紧凑易打理,色调温暖素雅;虽是市中心地址,却格外安静。\n\n整套住宅由您独享,并含一个专属院内停车位。密码锁自助入住,无论航班或活动时间多晚,都可自行抵达。本小区为小型住宅社区,晚上 10 点后请在共用车道与庭院区域保持安静。\n\nBealey Avenue 是环绕基督城市中心的四条林荫大道之一。住在这里,城市的一切近在咫尺,又避开了最喧闹的核心地带。\n\n周边距离:\n· Te Kaha / One NZ 体育场 —— 车程 6 分钟,步行 25–30 分钟\n· Hagley Park 与植物园 —— 步行 15 分钟\n· Victoria Street 餐厅与酒吧 —— 步行 5 分钟\n· Riverside Market 与 The Crossing 商场 —— 步行 15 分钟\n· 基督城医院 Christchurch Hospital —— 车程 5 分钟\n· Merivale 商店与咖啡馆 —— 车程 5 分钟\n\n周边街道平坦,适合步行与骑行;Bealey Avenue 沿线公交班次密集,可直达市中心换乘站。遇有大型活动,多数房客会开车前来、停好车,再步行或打车前往——这个专属车位正是此处的便利所在。\n\n入住期间如有任何需要,可直接通过本网站联系房东。房东就在基督城本地,通常当天即可协助处理。",
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
 * Finds the profile for a home by its `key`, falling back to the old Hostaway
 * ids and names in `match`. Returns undefined for an unknown home — which is
 * a normal state, not an error.
 */
export function homeProfileFor(
  listing: HomeIdentity,
): HomeProfile | undefined {
  const id = normalize(listing.id);
  const name = normalize(listing.name);
  return HOMES.find(
    (home) =>
      home.key === id ||
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

export function resolveBedroomsLabel(
  listing: HomeIdentity,
  locale: string,
): string | null {
  const profile = homeProfileFor(listing);
  const override =
    profile?.bedroomsLabel?.[locale === "zh-CN" ? "zh-CN" : "en"];
  return override && override.trim().length > 0 ? override : null;
}

export function resolveTourUrl(listing: HomeIdentity): string | null {
  const value = homeProfileFor(listing)?.tourUrl;
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

/**
 * A home as its property card renders it. Counts the profile leaves out are
 * null, and the card hides those lines. Photos are empty until they're added;
 * the card shows a placeholder meanwhile.
 */
export interface HomeListing {
  id: string;
  name: string;
  /** English description; the card swaps in Mandarin via resolveDescription. */
  description: string;
  bedrooms: number;
  bathrooms: number | null;
  maxGuests: number | null;
  minNights: number;
  address: { city: string; region: string };
  images: ListingImage[];
  amenities: Amenity[];
}

/** Every home on the site, in the order listed in HOMES. */
export function homeListings(): HomeListing[] {
  return HOMES.map((home) => ({
    id: home.key,
    name: home.name,
    description: home.description.en,
    bedrooms: home.bedrooms,
    bathrooms: home.bathrooms ?? null,
    maxGuests: home.maxGuests ?? null,
    minNights: home.minNights ?? 1,
    address: home.address,
    images: [],
    amenities: (home.amenities ?? []).map((name) => ({ id: name, name })),
  }));
}
