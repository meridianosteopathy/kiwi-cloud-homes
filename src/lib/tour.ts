/**
 * 360° tour provider detection. Embeds vary in iframe attrs and behaviour;
 * we tag the URL with a provider hint so the embed component can pick the
 * right allow/sandbox/aspect-ratio defaults.
 */

export type TourProvider = "matterport" | "kuula" | "youtube" | "generic";

const PATTERNS: Array<{ provider: TourProvider; match: RegExp }> = [
  { provider: "matterport", match: /matterport\.com/i },
  { provider: "kuula", match: /kuula\.co/i },
  { provider: "youtube", match: /(youtube\.com|youtu\.be)/i },
];

export function detectTourProvider(url: string): TourProvider {
  for (const p of PATTERNS) if (p.match.test(url)) return p.provider;
  return "generic";
}

/**
 * Per-provider `allow` attributes for the iframe — VR + sensors + fullscreen.
 * Matterport's VR mode needs xr-spatial-tracking; YouTube wants the standard
 * media permissions.
 */
export function tourIframeAllow(provider: TourProvider): string {
  switch (provider) {
    case "matterport":
      return "xr-spatial-tracking; gyroscope; accelerometer; magnetometer; fullscreen";
    case "kuula":
      return "fullscreen; gyroscope; accelerometer; magnetometer; xr-spatial-tracking";
    case "youtube":
      return "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    default:
      return "fullscreen; gyroscope; accelerometer; magnetometer; xr-spatial-tracking";
  }
}

/**
 * Some providers prefer a specific URL shape for embedding. The host should
 * paste the embed URL but tolerate the share URL where the conversion is
 * mechanical and safe.
 */
export function normaliseTourUrl(url: string): string {
  const trimmed = url.trim();
  // YouTube watch URL -> embed URL
  const ytMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([\w-]+)/i,
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const ytShort = trimmed.match(/^(?:https?:\/\/)?youtu\.be\/([\w-]+)/i);
  if (ytShort) return `https://www.youtube.com/embed/${ytShort[1]}`;
  return trimmed;
}
