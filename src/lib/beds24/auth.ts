/**
 * Beds24 API v2 authentication.
 *
 * Beds24 issues a one-time invite code in the control panel (Settings ->
 * Marketplace -> API; the page at beds24.com/control3.php?pagetype=apiv2).
 * Exchanging it via GET /authentication/setup yields a long-lived refresh
 * token; GET /authentication/token then mints 24-hour access tokens from it.
 * Every other call carries the access token in a `token` header. See
 * scripts/beds24-setup.mjs for the one-time exchange.
 *
 * Configuration:
 *   BEDS24_REFRESH_TOKEN  (production) we mint and cache access tokens.
 *                         Stays valid as long as it is used at least every
 *                         30 days, which a live website does daily.
 *   BEDS24_TOKEN          (local read-only testing) a ready-made long-life
 *                         token used as-is. Long-life tokens are read-only in
 *                         Beds24, so this cannot create bookings.
 */

const DEFAULT_API_BASE = "https://api.beds24.com/v2";
const SAFETY_MARGIN_MS = 5 * 60_000;
const FALLBACK_LIFETIME_S = 24 * 60 * 60;

export interface Beds24Credentials {
  apiBase: string;
  refreshToken?: string;
  staticToken?: string;
}

export function readCredentials(): Beds24Credentials {
  const apiBase = (process.env.BEDS24_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
  const refreshToken = process.env.BEDS24_REFRESH_TOKEN?.trim() || undefined;
  const staticToken = process.env.BEDS24_TOKEN?.trim() || undefined;
  if (!refreshToken && !staticToken) {
    throw new Beds24ConfigError(
      "Beds24 is selected (BOOKING_BACKEND=beds24) but neither BEDS24_REFRESH_TOKEN nor BEDS24_TOKEN is set. " +
        "Run `npm run beds24:setup -- <invite code>` to obtain a refresh token.",
    );
  }
  return { apiBase, refreshToken, staticToken };
}

type CachedToken = { token: string; expiresAt: number };
let cached: CachedToken | null = null;
let inflight: Promise<CachedToken> | null = null;

export async function getAccessToken(forceRefresh = false): Promise<string> {
  const creds = readCredentials();
  if (!creds.refreshToken && creds.staticToken) {
    return creds.staticToken;
  }
  const now = Date.now();
  if (!forceRefresh && cached && now < cached.expiresAt - SAFETY_MARGIN_MS) {
    return cached.token;
  }
  if (!inflight) {
    inflight = mintToken(creds).finally(() => {
      inflight = null;
    });
  }
  cached = await inflight;
  return cached.token;
}

async function mintToken(creds: Beds24Credentials): Promise<CachedToken> {
  const res = await fetch(`${creds.apiBase}/authentication/token`, {
    method: "GET",
    headers: {
      refreshToken: creds.refreshToken ?? "",
      accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Beds24AuthError(
      `Beds24 token refresh failed: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 300)}` : ""}. ` +
        "If this persists the refresh token has lapsed (unused for 30 days) or was revoked: run `npm run beds24:setup -- <new invite code>`.",
    );
  }
  let json: { token?: string; expiresIn?: number } = {};
  try {
    json = JSON.parse(text) as { token?: string; expiresIn?: number };
  } catch {
    throw new Beds24AuthError("Beds24 token refresh returned a non-JSON body.");
  }
  if (!json.token) {
    throw new Beds24AuthError(
      `Beds24 token refresh response had no token: ${text.slice(0, 200)}`,
    );
  }
  const lifetime =
    typeof json.expiresIn === "number" && json.expiresIn >= 60
      ? json.expiresIn
      : FALLBACK_LIFETIME_S;
  return { token: json.token, expiresAt: Date.now() + lifetime * 1000 };
}

/** Drops the cached access token. Used after an auth failure so the retry re-mints. */
export function clearAccessTokenCache(): void {
  cached = null;
  inflight = null;
}

/**
 * Beds24 documents 400 for errors, so an expired or invalid token can arrive
 * as HTTP 400 {"success": false, "type": "error", "error": "Invalid token"}
 * rather than 401. Both count as "re-authenticate and retry once".
 */
export function looksLikeAuthFailure(status: number, bodyText: string): boolean {
  if (status === 401) return true;
  if (status !== 400 && status !== 403) return false;
  return /token/i.test(bodyText) && /invalid|expired|missing|unauthori[sz]ed/i.test(bodyText);
}

export class Beds24ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Beds24ConfigError";
  }
}

export class Beds24AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Beds24AuthError";
  }
}
