import type { Amenity } from "@/lib/hostaway";

/**
 * Long-stay essentials are weighted highest. The catalog matches Hostaway's
 * English amenity names with regex so we tolerate variants like
 * "Wifi" / "Wi-Fi" / "Wireless Internet". Anything not matched gets a
 * default priority of 10 (shown last, no icon).
 *
 * Priorities are deliberately spaced so a future addition (e.g. "Crib")
 * can be slotted in without rearranging neighbours.
 */
type Rule = {
  match: RegExp;
  /** Higher = shown earlier. */
  priority: number;
  icon: string;
  /** Localized name overrides for the recognised amenity. */
  label: { zhCN: string; en: string };
};

const RULES: Rule[] = [
  // Tier 1 — must-haves for a 2-week+ family stay
  {
    match: /\b(wi.?fi|wireless internet|internet)\b/i,
    priority: 100,
    icon: "📶",
    label: { zhCN: "无线网络 Wi-Fi", en: "Wi-Fi" },
  },
  {
    match: /\bkitchen\b/i,
    priority: 95,
    icon: "🍳",
    label: { zhCN: "厨房", en: "Kitchen" },
  },
  {
    match: /\b(washer|washing machine|laundry)\b/i,
    priority: 92,
    icon: "🧺",
    label: { zhCN: "洗衣机", en: "Washer" },
  },
  // Note: hair-dryer rule sits later in the array but is also checked AFTER
  // this one in `find()`. The negative lookbehind keeps "Hair dryer" from
  // accidentally matching the laundry dryer rule.
  {
    match: /(?<!hair[\s-]?)\bdryer\b/i,
    priority: 91,
    icon: "🌀",
    label: { zhCN: "烘干机", en: "Dryer" },
  },
  {
    match: /\bheating\b/i,
    priority: 90,
    icon: "🔥",
    label: { zhCN: "暖气 / 取暖", en: "Heating" },
  },
  {
    match: /\b(heat pump|air condition|cooling|ac)\b/i,
    priority: 88,
    icon: "❄️",
    label: { zhCN: "空调 / 热泵", en: "Heat pump / AC" },
  },
  {
    match: /\bworkspace|laptop friendly\b/i,
    priority: 85,
    icon: "💻",
    label: { zhCN: "独立办公区", en: "Workspace" },
  },
  {
    match: /(free parking|parking on premises|car park|garage)/i,
    priority: 82,
    icon: "🚗",
    label: { zhCN: "免费停车", en: "Free parking" },
  },

  // Tier 2 — daily-life conveniences
  {
    match: /\bdishwasher\b/i,
    priority: 70,
    icon: "🍽️",
    label: { zhCN: "洗碗机", en: "Dishwasher" },
  },
  {
    match: /\bmicrowave\b/i,
    priority: 68,
    icon: "🍲",
    label: { zhCN: "微波炉", en: "Microwave" },
  },
  {
    match: /\b(fridge|refrigerator)\b/i,
    priority: 66,
    icon: "🧊",
    label: { zhCN: "冰箱", en: "Fridge" },
  },
  {
    match: /\b(oven|stove|hob|cooktop)\b/i,
    priority: 64,
    icon: "🍳",
    label: { zhCN: "灶台 / 烤箱", en: "Oven / stove" },
  },
  {
    match: /\b(coffee|kettle|tea)\b/i,
    priority: 60,
    icon: "☕",
    label: { zhCN: "咖啡机 / 电热水壶", en: "Coffee / kettle" },
  },
  {
    match: /\biron\b/i,
    priority: 55,
    icon: "👔",
    label: { zhCN: "熨斗", en: "Iron" },
  },
  {
    match: /\b(tv|television|cable|netflix)\b/i,
    priority: 50,
    icon: "📺",
    label: { zhCN: "电视", en: "TV" },
  },
  {
    match: /\b(crib|cot|high chair|baby)\b/i,
    priority: 45,
    icon: "👶",
    label: { zhCN: "婴儿设施", en: "Baby gear" },
  },

  // Tier 3 — leisure / nice-to-have
  {
    match: /\b(bbq|barbecue|grill)\b/i,
    priority: 30,
    icon: "🍖",
    label: { zhCN: "烧烤架", en: "BBQ grill" },
  },
  {
    match: /\b(pool|swimming)\b/i,
    priority: 28,
    icon: "🏊",
    label: { zhCN: "泳池", en: "Pool" },
  },
  {
    match: /\b(hot tub|spa|jacuzzi)\b/i,
    priority: 27,
    icon: "♨️",
    label: { zhCN: "热水浴缸", en: "Hot tub" },
  },
  {
    match: /\b(garden|yard|patio|outdoor)\b/i,
    priority: 26,
    icon: "🌳",
    label: { zhCN: "花园 / 户外空间", en: "Garden / outdoor" },
  },

  // Tier 4 — safety / housekeeping (assumed but worth showing)
  {
    match: /\b(hair ?dryer|hairdryer)\b/i,
    priority: 20,
    icon: "💨",
    label: { zhCN: "吹风机", en: "Hair dryer" },
  },
  {
    match: /\b(towels|linen|bed linen)\b/i,
    priority: 18,
    icon: "🧻",
    label: { zhCN: "毛巾床品", en: "Towels & linen" },
  },
  {
    match: /\b(smoke alarm|smoke detector)\b/i,
    priority: 15,
    icon: "🚨",
    label: { zhCN: "烟雾报警", en: "Smoke alarm" },
  },
  {
    match: /\b(carbon monoxide|co alarm)\b/i,
    priority: 14,
    icon: "🚨",
    label: { zhCN: "一氧化碳报警", en: "CO alarm" },
  },
  {
    match: /\b(first aid|fire extinguisher)\b/i,
    priority: 12,
    icon: "🩹",
    label: { zhCN: "急救 / 灭火器", en: "First aid / extinguisher" },
  },
];

const DEFAULT_PRIORITY = 5;
const DEFAULT_ICON = "•";

export interface ResolvedAmenity {
  id: string;
  /** Localized display label. */
  label: string;
  icon: string;
  priority: number;
}

export function resolveAmenity(
  amenity: Amenity,
  locale: "zh-CN" | "en",
): ResolvedAmenity {
  const rule = RULES.find((r) => r.match.test(amenity.name));
  if (rule) {
    return {
      id: amenity.id || amenity.name,
      label: locale === "zh-CN" ? rule.label.zhCN : rule.label.en,
      icon: rule.icon,
      priority: rule.priority,
    };
  }
  return {
    id: amenity.id || amenity.name,
    label: amenity.name,
    icon: DEFAULT_ICON,
    priority: DEFAULT_PRIORITY,
  };
}

/**
 * De-duplicate (Hostaway sometimes returns multiple variants for the same
 * concept, e.g. "Free parking on premises" + "Free parking"), then sort by
 * priority descending. Stable on equal priorities so the original Hostaway
 * order is preserved within a tier.
 */
export function sortAmenities(
  amenities: Amenity[],
  locale: "zh-CN" | "en",
): ResolvedAmenity[] {
  const seen = new Set<string>();
  const resolved: ResolvedAmenity[] = [];
  for (const a of amenities) {
    const r = resolveAmenity(a, locale);
    if (seen.has(r.label)) continue;
    seen.add(r.label);
    resolved.push(r);
  }
  return resolved.sort((a, b) => b.priority - a.priority);
}
