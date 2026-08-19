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
  // An explicit "bedroom" outranks the bathroom rule below, so "master
  // bedroom with ensuite" files under bedrooms rather than bathrooms — which
  // matters for a listing whose selling point is its ensuites.
  { category: "bedroom", match: /\b(bed|beds|bedroom|bedrooms)\b|卧室|主卧|次卧/i },
  { category: "bathroom", match: /\b(bath(room)?|shower|toilet|en[\s-]?suite|vanity|powder room|wc)\b|浴室|卫生间|淋浴|洗手间/i },
  // Bedroom by implication — checked after bathroom so "master bathroom"
  // isn't dragged into bedrooms by the word "master".
  { category: "bedroom", match: /\b(master|guest room|nursery|primary bedroom|twin room|bunk)\b/i },
  { category: "kitchen", match: /\b(kitchen|cook|stove|hob|oven|pantry|island bench)\b|厨房|料理/i },
  { category: "dining", match: /\b(dining|breakfast (bar|nook)|table|meal)\b|餐厅|用餐|餐桌/i },
  { category: "living", match: /\b(living( room)?|lounge|sofa|couch|family room|sitting)\b|客厅|起居/i },
  { category: "office", match: /\b(office|study|workspace|desk|laptop|work[\s-]?from[\s-]?home)\b|书房|办公/i },
  { category: "outdoor", match: /\b(garden|yard|courtyard|patio|deck|balcony|terrace|veranda|verandah|outdoor|backyard|bbq|barbecue|alfresco|lawn|porch)\b|花园|后院|庭院|阳台|露台|户外/i },
  { category: "exterior", match: /\b(exterior|frontage|front (of |door|porch)|street view|facade|façade|drive[\s-]?way|carport|car ?park|kerb|curb|building)\b|外景|外观|门口|车道|停车/i },
];

const IMAGE_EXTENSION = /\.(jpe?g|png|webp|heic|heif|gif|avif|tiff?|bmp)$/i;

/** "IMG_4821", "DSC00012", "PXL_20240110" — a camera's name for a file. */
const CAMERA_FILENAME = /^(img|dsc|dscn|pxl|photo|image|screenshot)[\s_-]*\d+$/i;

/**
 * Turns a caption into something the keyword rules can read.
 *
 * Hosts commonly leave Hostaway's caption as the uploaded filename —
 * "01-exterior-front.jpg". That's descriptive, just not prose: the separators
 * and the extension stop the word-boundary rules from seeing "exterior", so
 * every such photo would land in "other" and the gallery grouping collapses.
 * Strip the extension, turn separators and sequence numbers into spaces, and
 * the words come through.
 */
function matchableText(caption: string): string {
  return caption
    .replace(IMAGE_EXTENSION, " ")
    .replace(/[_\-.]+/g, " ")
    .replace(/\d+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The caption as a guest should see it, or "" when it isn't fit to show.
 *
 * A filename is useful for sorting photos into rooms but reads as a mistake
 * printed under a photo, so those are suppressed for display while still
 * feeding {@link categorizeImage}. Real prose captions pass through untouched.
 */
export function presentableCaption(
  caption: string | null | undefined,
): string {
  const c = (caption ?? "").trim();
  if (!c) return "";
  // "01-exterior-front.jpg" — anything still carrying a file extension.
  if (IMAGE_EXTENSION.test(c)) return "";
  if (CAMERA_FILENAME.test(c)) return "";
  // "exterior-front", "bedroom_2" — slug-shaped: no spaces, but separators or
  // digits. A plain word like "Kitchen" is a fine caption and survives.
  if (!/\s/.test(c) && /[-_]|\d/.test(c)) return "";
  return c;
}

export function categorizeImage(caption: string | null | undefined): ImageCategory {
  if (!caption) return "other";
  const c = matchableText(caption.trim());
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
