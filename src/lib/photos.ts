/**
 * Derive a room/area category from a listing image caption. Hostaway doesn't
 * tag images with a structured room type, so we infer from keywords in the
 * caption — usually descriptive ("Spacious master bedroom with..."). Falls
 * back to "other" when nothing matches so unknown photos still appear in
 * the grouped lightbox under a generic heading.
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

// First-match wins; order from most specific to most generic.
// Each rule includes both English and common Chinese keywords so a host
// writing in either language is handled.
const RULES: Array<{ category: ImageCategory; match: RegExp }> = [
  { category: "bathroom", match: /\b(bath(room)?|shower|toilet|en[\s-]?suite|vanity)\b|浴室|卫生间|淋浴/i },
  { category: "bedroom", match: /\b(bed(room)?|master|guest room|nursery|primary bedroom)\b|卧室|主卧|次卧/i },
  { category: "kitchen", match: /\b(kitchen|cook|stove|hob|oven|pantry|island bench)\b|厨房|料理/i },
  { category: "dining", match: /\b(dining|breakfast (bar|nook)|table|meal)\b|餐厅|用餐|餐桌/i },
  { category: "living", match: /\b(living( room)?|lounge|sofa|couch|family room|sitting)\b|客厅|起居/i },
  { category: "office", match: /\b(office|study|workspace|desk|laptop|work[\s-]?from[\s-]?home)\b|书房|办公/i },
  { category: "outdoor", match: /\b(garden|yard|patio|deck|outdoor|backyard|bbq|barbecue|alfresco|lawn|porch)\b|花园|后院|庭院|户外/i },
  { category: "exterior", match: /\b(exterior|front (of |door|porch)|street view|facade|façade|drive[\s-]?way|kerb|curb|building)\b|外景|外观|门口|车道/i },
];

export function categorizeImage(caption: string | null | undefined): ImageCategory {
  if (!caption) return "other";
  const c = caption.trim();
  if (!c) return "other";
  for (const rule of RULES) {
    if (rule.match.test(c)) return rule.category;
  }
  return "other";
}

/**
 * Groups images by their category, preserving the within-group order
 * (which should be the host's intended order, i.e. by sortOrder).
 * Returns categories in CATEGORY_ORDER, skipping empty buckets.
 */
export function groupImagesByCategory<T extends { category: ImageCategory }>(
  images: T[],
): Array<{ category: ImageCategory; items: T[] }> {
  const buckets = new Map<ImageCategory, T[]>();
  for (const img of images) {
    const list = buckets.get(img.category) ?? [];
    list.push(img);
    buckets.set(img.category, list);
  }
  return CATEGORY_ORDER.filter((c) => (buckets.get(c)?.length ?? 0) > 0).map(
    (c) => ({ category: c, items: buckets.get(c) ?? [] }),
  );
}
