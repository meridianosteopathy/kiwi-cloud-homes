/**
 * Live Hostaway client — implements read-only endpoints against the v1 API.
 * Writes (createInquiry) intentionally throw until we have a sandbox account.
 *
 * Response shapes are based on the public Hostaway API documentation:
 *   GET /v1/listings/:id     -> { status, result: HostawayApiListing }
 *   GET /v1/listings          -> { status, result: HostawayApiListing[] }
 *   GET /v1/listings/:id/calendar?startDate&endDate
 *                             -> { status, result: HostawayApiCalendarDay[] }
 */

import {
  clearAccessTokenCache,
  getAccessToken,
  HostawayAuthError,
  readCredentials,
} from "./auth";
import type {
  AvailabilityDay,
  HostawayClient,
  HostawayListing,
  InquiryInput,
  InquiryResult,
} from "./types";

interface HostawayApiListing {
  id: number;
  name?: string;
  internalListingName?: string;
  publicName?: string;
  description?: string;
  bedroomsNumber?: number;
  bathroomsNumber?: number;
  personCapacity?: number;
  price?: number;
  cleaningFee?: number;
  currencyCode?: string;
  address?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  thumbnailUrl?: string;
  /**
   * Only populated when the listing is fetched with `?includeResources=1`.
   * Otherwise returned as an empty array.
   */
  listingImages?: Array<{ url?: string; sortOrder?: number }>;
}

/** Query string Hostaway needs to populate sub-resources like listingImages. */
const LISTING_INCLUDE = "?includeResources=1";

interface HostawayApiCalendarDay {
  date: string;
  status?: string;
  isAvailable?: boolean | 0 | 1;
  price?: number;
}

interface HostawayApiEnvelope<T> {
  status?: string;
  result?: T;
}

export function createLiveClient(): HostawayClient {
  // Validate config eagerly so a missing env var is reported at startup,
  // not on first request.
  readCredentials();

  return {
    async getListing() {
      const id = await resolveListingId();
      const payload = await apiGet<HostawayApiListing>(
        `/listings/${id}${LISTING_INCLUDE}`,
      );
      return mapListing(payload);
    },

    async getAvailability(start, end) {
      const id = await resolveListingId();
      const payload = await apiGet<HostawayApiCalendarDay[]>(
        `/listings/${id}/calendar?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`,
      );
      const currency = await currencyForListing(id);
      return payload.map<AvailabilityDay>((d) => mapCalendarDay(d, currency));
    },

    async createInquiry(_input: InquiryInput): Promise<InquiryResult> {
      throw new HostawayNotImplementedError(
        "createInquiry is not implemented for the live client yet. " +
          "Set HOSTAWAY_USE_MOCK=true for inquiry flows until the messaging integration ships.",
      );
    },
  };
}

let cachedListingId: string | null = null;
let cachedCurrency: { listingId: string; currency: string } | null = null;

async function resolveListingId(): Promise<string> {
  if (cachedListingId) return cachedListingId;
  const explicit = process.env.HOSTAWAY_LISTING_ID;
  if (explicit) {
    cachedListingId = explicit;
    return explicit;
  }
  const listings = await apiGet<HostawayApiListing[]>("/listings?limit=1");
  if (!Array.isArray(listings) || listings.length === 0) {
    throw new HostawayApiError(
      "GET /listings returned no listings. Set HOSTAWAY_LISTING_ID or add a listing to your Hostaway account.",
    );
  }
  cachedListingId = String(listings[0].id);
  return cachedListingId;
}

async function currencyForListing(listingId: string): Promise<string> {
  if (cachedCurrency && cachedCurrency.listingId === listingId) {
    return cachedCurrency.currency;
  }
  const listing = await apiGet<HostawayApiListing>(`/listings/${listingId}`);
  const currency = listing.currencyCode || "NZD";
  cachedCurrency = { listingId, currency };
  return currency;
}

async function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>("GET", path);
}

async function apiRequest<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const creds = readCredentials();
  const url = `${creds.apiBase}${path}`;

  const send = async (token: string): Promise<Response> =>
    fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

  let token = await getAccessToken();
  let res = await send(token);

  // 401 -> clear token and retry once.
  if (res.status === 401) {
    clearAccessTokenCache();
    try {
      token = await getAccessToken(true);
    } catch (err) {
      throw new HostawayAuthError(
        `Hostaway 401 then re-auth failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    res = await send(token);
  }

  if (!res.ok) {
    const snippet = await readSnippet(res);
    throw new HostawayApiError(
      `Hostaway ${method} ${path} failed: ${res.status} ${res.statusText}${snippet}`,
    );
  }

  const envelope = (await res.json()) as HostawayApiEnvelope<T>;
  if (envelope.status && envelope.status !== "success") {
    throw new HostawayApiError(
      `Hostaway ${method} ${path} returned non-success envelope: ${JSON.stringify(envelope).slice(0, 300)}`,
    );
  }
  if (envelope.result === undefined) {
    throw new HostawayApiError(
      `Hostaway ${method} ${path} envelope missing 'result' field.`,
    );
  }
  return envelope.result;
}

async function readSnippet(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text ? ` — ${text.slice(0, 300)}` : "";
  } catch {
    return "";
  }
}

function mapListing(api: HostawayApiListing): HostawayListing {
  const currency = api.currencyCode || "NZD";

  const orderedImages = [...(api.listingImages ?? [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((i) => i.url)
    .filter((u): u is string => Boolean(u));

  // Fall back to the top-level thumbnail when the resources aren't included
  // (e.g. a different fetch path or an account quirk).
  const images =
    orderedImages.length > 0
      ? orderedImages
      : api.thumbnailUrl
        ? [api.thumbnailUrl]
        : [];

  return {
    id: String(api.id),
    name: api.publicName || api.name || api.internalListingName || "Listing",
    description: api.description ?? "",
    bedrooms: api.bedroomsNumber ?? 0,
    bathrooms: api.bathroomsNumber ?? 0,
    maxGuests: api.personCapacity ?? 0,
    basePrice: { amount: api.price ?? 0, currency },
    cleaningFee: api.cleaningFee ?? 0,
    images,
    address: {
      line1: api.street || api.address || "—",
      city: api.city || "",
      region: api.state || "",
      country: api.country || "",
    },
  };
}

function mapCalendarDay(
  d: HostawayApiCalendarDay,
  currency: string,
): AvailabilityDay {
  const available =
    typeof d.isAvailable === "boolean"
      ? d.isAvailable
      : d.isAvailable === 1
        ? true
        : d.isAvailable === 0
          ? false
          : d.status === "available";
  return {
    date: d.date,
    available,
    price: { amount: d.price ?? 0, currency },
  };
}

export class HostawayApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostawayApiError";
  }
}

export class HostawayNotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HostawayNotImplementedError";
  }
}
