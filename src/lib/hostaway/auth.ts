/**
 * Hostaway OAuth2 client-credentials flow + in-memory access-token cache.
 *
 * Tokens are long-lived (Hostaway returns ~24 months) but we still cache by
 * expiry with a safety margin and expose a forced-refresh path so 401s during
 * a request can recover without leaking a stale token across retries.
 */

const TOKEN_PATH = "/accessTokens";
const SAFETY_MARGIN_MS = 5 * 60_000; // refresh 5 min early

type CachedToken = {
  accessToken: string;
  expiresAt: number;
};

let cached: CachedToken | null = null;
let inflight: Promise<CachedToken> | null = null;

export interface HostawayCredentials {
  accountId: string;
  clientId: string;
  clientSecret: string;
  apiBase: string;
}

export function readCredentials(): HostawayCredentials {
  const accountId = required("HOSTAWAY_ACCOUNT_ID");
  const clientId = required("HOSTAWAY_CLIENT_ID");
  const clientSecret = required("HOSTAWAY_CLIENT_SECRET");
  const apiBase = (
    process.env.HOSTAWAY_API_BASE || "https://api.hostaway.com/v1"
  ).replace(/\/$/, "");
  return { accountId, clientId, clientSecret, apiBase };
}

function required(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new HostawayConfigError(
      `Missing required env var ${key}. Set it in .env.local or your deploy environment.`,
    );
  }
  return v;
}

export async function getAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cached && now < cached.expiresAt - SAFETY_MARGIN_MS) {
    return cached.accessToken;
  }

  // Coalesce concurrent refreshes.
  if (!inflight) {
    inflight = fetchToken().finally(() => {
      inflight = null;
    });
  }
  cached = await inflight;
  return cached.accessToken;
}

async function fetchToken(): Promise<CachedToken> {
  const creds = readCredentials();
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
    scope: "general",
  });

  const res = await fetch(`${creds.apiBase}${TOKEN_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const snippet = await readSnippet(res);
    throw new HostawayAuthError(
      `Hostaway auth failed: ${res.status} ${res.statusText}${snippet}`,
    );
  }

  const json = (await res.json()) as {
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  };

  if (!json.access_token || typeof json.expires_in !== "number") {
    throw new HostawayAuthError(
      `Hostaway auth response missing access_token or expires_in: ${JSON.stringify(json).slice(0, 200)}`,
    );
  }

  return {
    accessToken: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

async function readSnippet(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text ? ` — ${text.slice(0, 300)}` : "";
  } catch {
    return "";
  }
}

/** Resets the cached token. Exposed for tests + 401 recovery. */
export function clearAccessTokenCache(): void {
  cached = null;
  inflight = null;
}

export class HostawayConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostawayConfigError";
  }
}

export class HostawayAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostawayAuthError";
  }
}
