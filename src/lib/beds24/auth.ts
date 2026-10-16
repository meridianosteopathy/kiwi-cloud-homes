/**
 * Beds24 API v2 authentication.
 *
 * Beds24 issues a one-time invite code in the dashboard (Settings -> Apps &
 * Integrations -> API). Exchanging it via GET /authentication/setup yields a
 * long-lived refresh token; GET /authentication/token then mints 24-hour
 * access tokens from it. Every other call carries the access token in a
 * `token` header. See scripts/beds24-setup.mjs for the one-time exchange.
 *
 * Two ways to configure:
 *   BEDS24_REFRESH_TOKEN  (preferred) we mint and cache access tokens
 *   BEDS24_TOKEN          a ready-made token used as-is (no refresh possible)
 */

const DEFAULT_API_BASE = "https://beds24.com/api/v2";
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
        "Run `node scripts/beds24-setup.mjs <invite code>` to obtain a refresh token.",
    );
  }
  return { apiBase, refreshToken, staticToken };
}

type CachedToken = { token: string; expiresAt: number };
let cached: CachedToken | null = null;
let inflight: Promise<CachedToken> | null = null;

export async function getAccessToken(forceRefresh = false): Promise<string> {
  const creds = readCredentials();
  if (creds.staticToken && !creds.refreshToken) {
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
      `Beds24 token refresh failed: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 300)}` : ""}`,
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
    typeof json.expiresIn === "number" && json.expiresIn > 60
      ? json.expiresIn
      : FALLBACK_LIFETIME_S;
  return { token: json.token, expiresAt: Date.now() + lifetime * 1000 };
}

/** Drops the cached access token. Used after a 401 so the retry re-mints. */
export function clearAccessTokenCache(): void {
  cached = null;
  inflight = null;
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
