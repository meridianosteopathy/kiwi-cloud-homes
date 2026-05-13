/**
 * Per-locale overrides for the Hostaway listing.
 *
 * Hostaway only stores one description per listing — typically the host's
 * English copy. Until Hostaway custom fields (or a small CMS) are wired in,
 * the host can edit this file to provide a Mandarin description that
 * replaces the API value when the visitor's locale is zh-CN.
 *
 * To update:
 *   1. Open this file in VS Code.
 *   2. Edit the `description["zh-CN"]` string below.
 *   3. Commit + push + merge.
 *
 * Empty / undefined strings fall back to the Hostaway-returned description.
 */

export const LISTING_OVERRIDES: {
  description: Partial<Record<"zh-CN" | "en", string>>;
} = {
  description: {
    "zh-CN":
      "位于基督城西南区 Halswell 的明亮四居室家庭住宅,Cashmere High 与 Halswell School 学区内。开车前往 Riccarton、市中心 (CBD) 与 Lincoln 都很便利。\n\n房屋专为中长期入住设计:完整厨房与餐厅、独立办公区、舒适沙发、安静的卧室,以及高速 Wi-Fi、洗衣机、烘干机、暖气、热泵齐全。后院与花园适合带孩子放松,免费停车位充足。\n\n房东本地居住,沟通方便:看校、就医、生活采购、附近活动推荐,都可随时联系。",
    // en: undefined → keep the Hostaway-returned English description.
  },
};

export function resolveDescription(
  locale: string,
  fallback: string,
): string {
  const override = LISTING_OVERRIDES.description[
    locale === "zh-CN" ? "zh-CN" : "en"
  ];
  return override && override.trim().length > 0 ? override : fallback;
}
