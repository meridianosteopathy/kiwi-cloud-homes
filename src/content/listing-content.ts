/**
 * Per-locale overrides for the Hostaway listing.
 *
 * Hostaway only stores one description per listing — typically the host's
 * English copy. Until Hostaway custom fields (or a small CMS) are wired in,
 * the host can edit this file to provide a Mandarin description that
 * replaces the API value when the visitor's locale is zh-CN.
 *
 * The 360° tour URL also lives here, since Hostaway doesn't have a structured
 * field for it on this account.
 *
 * To update:
 *   1. Open this file in VS Code.
 *   2. Edit `description["zh-CN"]` and/or `tourUrl`.
 *   3. Commit + push + merge.
 *
 * Empty / undefined strings fall back to the Hostaway-returned values.
 */

export const LISTING_OVERRIDES: {
  description: Partial<Record<"zh-CN" | "en", string>>;
  /**
   * 360° virtual tour URL — paste the EMBED URL the tour provider gives you.
   *
   *   - Matterport: https://my.matterport.com/show/?m=YOUR-TOUR-ID
   *   - Kuula:      https://kuula.co/share/collection/YOUR-ID
   *   - YouTube:    https://www.youtube.com/embed/YOUR-VIDEO-ID
   *   - CloudPano, EyeSpy360, 3DVista, etc.: their share/embed URL
   *
   * Leave empty (or undefined) to hide the "360° Tour" button on the property
   * card. The current value is Matterport's public demo space — replace with
   * your own tour URL once you have one scanned.
   */
  tourUrl?: string;
} = {
  description: {
    "zh-CN":
      "位于基督城西南区 Halswell 的明亮四居室家庭住宅,Cashmere High 与 Halswell School 学区内。开车前往 Riccarton、市中心 (CBD) 与 Lincoln 都很便利。\n\n房屋专为中长期入住设计:完整厨房与餐厅、独立办公区、舒适沙发、安静的卧室,以及高速 Wi-Fi、洗衣机、烘干机、暖气、热泵齐全。后院与花园适合带孩子放松,免费停车位充足。\n\n房东本地居住,沟通方便:看校、就医、生活采购、附近活动推荐,都可随时联系。",
    // en: undefined → keep the Hostaway-returned English description.
  },
  tourUrl: "https://my.matterport.com/show/?m=SxQL3iGyoDo",
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

export function resolveTourUrl(fallback: string | undefined): string | null {
  const override = LISTING_OVERRIDES.tourUrl;
  const value = override && override.trim().length > 0 ? override : fallback;
  return value && value.trim().length > 0 ? value : null;
}
