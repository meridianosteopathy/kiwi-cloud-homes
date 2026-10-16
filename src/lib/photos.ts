/**
 * Derive a room/area category from a listing image caption. Hostaway doesn't
 * tag images with a structured room type, so we infer from keywords in the
 * caption — usually descriptive ("Spacious master bedroom with..."), but on
 * listings synced from Airbnb often just a short room label ("Bedroom 2",
 * "Balcony"). Falls back to "other" when nothing matches so unknown photos
 * still appear in the grouped lightbox under a generic heading.
 *
 * Order in CATEGORY_ORDER is the order categories render in the lightbox.
 */

export type ImageCategory =
  | "exterior"
  | "living"
  | "kitchen"
  | "dining"
  | "bedroom"
  | "bathroom"
  | "office"
  | "outdoor"
  | "other";

export const CATEGORY_ORDER: ImageCategory[] = [
  "exterior",
  "living",
  "kitchen",
  "dining",
  "bedroom",
  "bathroom",
  "office",
  "outdoor",
  "other",
];

// Order from most specific to most generic — it breaks ties when two rules
// match at the same position. Each rule includes both English and common
// Chinese keywords so a host writing in either language is handled.
const RULES: Array<{ category: ImageCategory; match: RegExp }> = [
  { category: "bathroom", match: /\b(bath(room|tub)?|shower|toilet|loo|w\.?c|powder room|en[\s-]?suite|vanity|basin)\b|浴室|卫生间|洗手间|淋浴|盥洗/i },
  { category: "bedroom", match: /\b(bed(room)?|master|guest room|nursery|primary bedroom|twin room|bunk|bunks)\b|卧室|主卧|次卧|睡房/i },
  { category: "kitchen", match: /\b(kitchen|kitchenette|cook|stove|hob|oven|pantry|island bench|benchtop)\b|厨房|料理/i },
  { category: "dining", match: /\b(dining|dining table|breakfast (bar|nook)|meals? area|dinner)\b|餐厅|用餐|餐桌/i },
  { category: "living", match: /\b(living( room| area)?|lounge|sofa|couch|family room|sitting|tv room)\b|客厅|起居/i },
  { category: "office", match: /\b(office|study|workspace|desk|laptop|work[\s-]?from[\s-]?home)\b|书房|办公/i },
  { category: "outdoor", match: /\b(garden|yard|patio|deck|outdoor|backyard|bbq|barbecue|alfresco|lawn|porch|balcony|courtyard|terrace|verandah?)\b|花园|后院|庭院|户外|阳台|露台/i },
  { category: "exterior", match: /\b(exterior|front (of |door|porch)|street view|facade|façade|drive[\s-]?way|kerb|curb|building|entrance|entry|car ?park|carport|parking|garage)\b|外景|外观|门口|车道|停车|车库/i },
];

/**
 * Leftmost keyword wins, with RULES order breaking ties. Captions name their
 * subject first — "Master bedroom with ensuite" is a bedroom, "Ensuite off the
 * master bedroom" is a bathroom — and first-rule-wins got the first of those
 * backwards.
 */
export function categorizeImage(caption: string | null | undefined): ImageCategory {
  if (!caption) return "other";
  const c = caption.trim();
  if (!c) return "other";

  let best: ImageCategory = "other";
  let bestAt = Infinity;
  for (const rule of RULES) {
    const at = c.search(rule.match);
    if (at !== -1 && at < bestAt) {
      best = rule.category;
      bestAt = at;
    }
  }
  return best;
}

/** One photo plus its position in the listing's own (host-ordered) list. */
export interface PhotoEntry<T> {
  image: T;
  /** Index into the array passed to `organizeImages` — stable across grouping. */
  index: number;
}

export interface PhotoSection<T> {
  category: ImageCategory;
  items: Array<PhotoEntry<T>>;
}

export interface PhotoGallery<T> {
  /**
   * True when the sections are meaningful room groups. False when the
   * captions didn't tell us enough and we fall back to a single flat
   * section in the host's own order.
   */
  grouped: boolean;
  sections: Array<PhotoSection<T>>;
}

/**
 * Grouping only helps when most photos actually landed in a room bucket.
 * A listing where four photos are categorised and twenty are "Other" reads
 * as broken, not organised — below these thresholds we show the host's
 * order instead.
 */
const MIN_CATEGORISED_SHARE = 0.6;
const MIN_CATEGORIES = 2;

/**
 * Groups images by their category, preserving the within-group order (which
 * should be the host's intended order, i.e. by sortOrder) and each photo's
 * original index. Returns categories in CATEGORY_ORDER, skipping empty
 * buckets — or one flat section when the captions are too sparse to group by.
 */
export function organizeImages<T extends { category: ImageCategory }>(
  images: T[],
): PhotoGallery<T> {
  const entries: Array<PhotoEntry<T>> = images.map((image, index) => ({
    image,
    index,
  }));

  const buckets = new Map<ImageCategory, Array<PhotoEntry<T>>>();
  for (const entry of entries) {
    const list = buckets.get(entry.image.category) ?? [];
    list.push(entry);
    buckets.set(entry.image.category, list);
  }

  const sections = CATEGORY_ORDER.filter(
    (c) => (buckets.get(c)?.length ?? 0) > 0,
  ).map((c) => ({ category: c, items: buckets.get(c) ?? [] }));

  const categorised = entries.length - (buckets.get("other")?.length ?? 0);
  const namedCategories = sections.filter((s) => s.category !== "other").length;
  const grouped =
    entries.length > 0 &&
    namedCategories >= MIN_CATEGORIES &&
    categorised / entries.length >= MIN_CATEGORISED_SHARE;

  if (!grouped) {
    return {
      grouped: false,
      sections: entries.length
        ? [{ category: "other" as const, items: entries }]
        : [],
    };
  }

  return { grouped, sections };
}
