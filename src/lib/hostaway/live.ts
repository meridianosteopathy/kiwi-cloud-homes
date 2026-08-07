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
import { categorizeImage } from "@/lib/photos";
import type {
  AvailabilityDay,
  HostawayClient,
  HostawayListing,
  InquiryInput,
  InquiryResult,
  ListingImage,
  ReservationInput,
  ReservationResult,
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
  minNights?: number;
  maxNights?: number;
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
  listingImages?: Array<{
    url?: string;
    sortOrder?: number;
    caption?: string;
    bookingEngineCaption?: string;
    airbnbCaption?: string;
    vrboCaption?: string;
  }>;
  /**
   * Same: populated with `?includeResources=1`. Shape per Hostaway docs is
   * `{ amenityId, amenityName, ... }`; we read a couple of alternate names
   * defensively in case the field rename ever happens.
   */
  listingAmenities?: Array<{
    amenityId?: number | string;
    amenityName?: string;
    id?: number | string;
    name?: string;
  }>;
}

/** Query string Hostaway needs to populate sub-resources like listingImages. */
const LISTING_INCLUDE = "?includeResources=1";

interface HostawayApiCalendarDay {
  date: string;
  status?: string;
  isAvailable?: boolean | 0 | 1;
  price?: number;
  minimumStay?: number;
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
    async listListings() {
      const ids = await resolveListingIds();
      const settled = await Promise.allSettled(ids.map(fetchListing));

      const listings: HostawayListing[] = [];
      const failures: string[] = [];
      settled.forEach((result, i) => {
        if (result.status === "fulfilled") {
          listings.push(result.value);
        } else {
          failures.push(ids[i]);
          console.error(
            `[hostaway] listing ${ids[i]} could not be loaded and is hidden from the site:`,
            result.reason instanceof Error ? result.reason.message : result.reason,
          );
        }
      });

      // One bad listing shouldn't blank the whole site — but if none loaded,
      // the page has nothing to show, so surface the error instead of
      // rendering an empty "no homes" state that looks like a config choice.
      if (listings.length === 0) {
        throw new HostawayApiError(
          `None of the configured listings could be loaded (${failures.join(", ") || "none configured"}).`,
        );
      }
      return listings;
    },

    async getListing(listingId?: string) {
      const id = listingId ?? (await resolveListingIds())[0];
      if (!id) {
        throw new HostawayApiError(
          "No Hostaway listings are configured for this site.",
        );
      }
      return fetchListing(id);
    },

    async getAvailability(listingId, start, end) {
      const payload = await apiGet<HostawayApiCalendarDay[]>(
        `/listings/${listingId}/calendar?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`,
      );
      const currency = await currencyForListing(listingId);
      return payload.map<AvailabilityDay>((d) => mapCalendarDay(d, currency));
    },

    async isConfiguredListing(listingId) {
      const ids = await resolveListingIds();
      return ids.includes(String(listingId));
    },

    async createInquiry(_input: InquiryInput): Promise<InquiryResult> {
      throw new HostawayNotImplementedError(
        "createInquiry is not implemented for the live client yet. " +
          "Set HOSTAWAY_USE_MOCK=true for inquiry flows until the messaging integration ships.",
      );
    },

    async createReservation(input: ReservationInput): Promise<ReservationResult> {
      // Hostaway POST /v1/reservations. Direct-channel = 2000.
      // Documented at https://api.hostaway.com/documentation#tag/Reservations
      const body = {
        listingMapId: Number(input.listingId),
        channelId: 2000,
        channelName: "Direct",
        guestFirstName: input.guestFirstName,
        guestLastName: input.guestLastName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone ?? "",
        arrivalDate: input.arrivalDate,
        departureDate: input.departureDate,
        nights: nightsBetween(input.arrivalDate, input.departureDate),
        numberOfGuests: input.numberOfGuests,
        totalPrice: input.totalPrice,
        currency: input.currency,
        status: "new",
        isPaid: 1,
        channelReservationId: input.externalRef,
      } as const;

      const created = await apiRequest<HostawayApiReservation>(
        "POST",
        "/reservations",
        body,
      );
      if (!created || created.id === undefined) {
        throw new HostawayApiError(
          "Hostaway POST /reservations succeeded but the response had no id.",
        );
      }
      return { id: String(created.id) };
    },
  };
}

interface HostawayApiReservation {
  id: number;
  channelReservationId?: string;
}

function nightsBetween(arrivalISO: string, departureISO: string): number {
  const a = new Date(arrivalISO + "T00:00:00Z").getTime();
  const b = new Date(departureISO + "T00:00:00Z").getTime();
  const n = Math.round((b - a) / 86_400_000);
  return n > 0 ? n : 0;
}

/**
 * Fetches one listing and reconciles its min-nights rule.
 *
 * Hostaway lets hosts set that rule in two places: the listing-level
 * `minNights` field, or as per-day `minimumStay` overrides on the calendar.
 * The dashboard's "Stay restrictions" workflow writes to the calendar,
 * leaving listing.minNights at 1. Reconcile here so the booking UI sees the
 * rule that's actually being enforced.
 */
async function fetchListing(id: string): Promise<HostawayListing> {
  const payload = await apiGet<HostawayApiListing>(
    `/listings/${id}${LISTING_INCLUDE}`,
  );
  const listing = mapListing(payload);
  const calendarMin = await calendarTypicalMinStay(id).catch((err) => {
    console.warn(
      `[hostaway] calendar min-stay lookup failed for listing ${id}; falling back to listing.minNights:`,
      err instanceof Error ? err.message : err,
    );
    return 0;
  });
  const effectiveMin = Math.max(listing.minNights, calendarMin);
  if (effectiveMin !== listing.minNights) {
    console.log(
      `[hostaway] listing ${id}: effective minNights ${effectiveMin} (listing=${listing.minNights}, calendar=${calendarMin})`,
    );
    return { ...listing, minNights: effectiveMin };
  }
  return listing;
}

let cachedListingIds: { ids: string[]; expiresAt: number } | null = null;
const cachedCurrency = new Map<string, string>();
const cachedCalendarMin = new Map<string, { value: number; expiresAt: number }>();
const CALENDAR_MIN_TTL_MS = 5 * 60 * 1000;
const CALENDAR_MIN_WINDOW_DAYS = 60;
/**
 * How long a discovered listing set is trusted. Bounded so a house imported
 * into Hostaway shows up on the site within minutes, without a redeploy.
 * Ids pinned via env don't expire — they can't change without one.
 */
const LISTING_IDS_TTL_MS = 5 * 60 * 1000;
/** Upper bound on auto-discovery, well clear of any plausible host portfolio. */
const MAX_DISCOVERED_LISTINGS = 50;

/**
 * Returns the typical (mode) per-day minimumStay across the next
 * CALENDAR_MIN_WINDOW_DAYS days of the calendar. Falls back to 0 when the
 * calendar doesn't carry any per-day rules (so the caller keeps the
 * listing-level minNights).
 */
async function calendarTypicalMinStay(listingId: string): Promise<number> {
  const now = Date.now();
  const hit = cachedCalendarMin.get(listingId);
  if (hit && hit.expiresAt > now) {
    return hit.value;
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + CALENDAR_MIN_WINDOW_DAYS);
  const startIso = today.toISOString().slice(0, 10);
  const endIso = end.toISOString().slice(0, 10);
  const days = await apiGet<HostawayApiCalendarDay[]>(
    `/listings/${listingId}/calendar?startDate=${encodeURIComponent(startIso)}&endDate=${encodeURIComponent(endIso)}`,
  );
  // Mode over positive values: lets a single one-off override (e.g. a
  // weekend with minStay=14) not displace the property's normal rule.
  const counts = new Map<number, number>();
  for (const d of days) {
    const v = typeof d.minimumStay === "number" ? d.minimumStay : 0;
    if (v >= 1) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let mode = 0;
  let modeCount = 0;
  for (const [v, c] of counts) {
    if (c > modeCount) {
      mode = v;
      modeCount = c;
    }
  }
  cachedCalendarMin.set(listingId, {
    value: mode,
    expiresAt: now + CALENDAR_MIN_TTL_MS,
  });
  return mode;
}

/**
 * The listings this site shows, in display order.
 *
 * Resolution order:
 *   1. HOSTAWAY_LISTING_IDS — comma-separated, e.g. "123456,789012". Pins
 *      both the set and the order.
 *   2. HOSTAWAY_LISTING_ID — the older single-listing var. Also accepts a
 *      comma-separated list, so an existing deploy can add a second house by
 *      appending to the value it already has.
 *   3. Neither set: every listing in the Hostaway account, in the order the
 *      API returns them. This is the default — import a house into Hostaway
 *      and it appears on the site.
 */
async function resolveListingIds(): Promise<string[]> {
  const now = Date.now();
  if (cachedListingIds && cachedListingIds.expiresAt > now) {
    return cachedListingIds.ids;
  }

  const pinned = parseIdList(
    process.env.HOSTAWAY_LISTING_IDS || process.env.HOSTAWAY_LISTING_ID,
  );
  if (pinned.length > 0) {
    cachedListingIds = { ids: pinned, expiresAt: Number.POSITIVE_INFINITY };
    return pinned;
  }

  const listings = await apiGet<HostawayApiListing[]>(
    `/listings?limit=${MAX_DISCOVERED_LISTINGS}`,
  );
  if (!Array.isArray(listings) || listings.length === 0) {
    throw new HostawayApiError(
      "GET /listings returned no listings. Add a listing to your Hostaway account, or set HOSTAWAY_LISTING_IDS.",
    );
  }
  const ids = listings.map((l) => String(l.id));
  cachedListingIds = { ids, expiresAt: now + LISTING_IDS_TTL_MS };
  return ids;
}

function parseIdList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (id) seen.add(id);
  }
  return [...seen];
}

async function currencyForListing(listingId: string): Promise<string> {
  const hit = cachedCurrency.get(listingId);
  if (hit) return hit;
  const listing = await apiGet<HostawayApiListing>(`/listings/${listingId}`);
  const currency = listing.currencyCode || "NZD";
  cachedCurrency.set(listingId, currency);
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

  const orderedImages: ListingImage[] = [...(api.listingImages ?? [])]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((i) => {
      const caption =
        i.caption ?? i.bookingEngineCaption ?? i.airbnbCaption ?? i.vrboCaption ?? "";
      return {
        url: i.url ?? "",
        caption,
        category: categorizeImage(caption),
      };
    })
    .filter((i) => Boolean(i.url));

  // Fall back to the top-level thumbnail when the resources aren't included
  // (e.g. a different fetch path or an account quirk).
  const images: ListingImage[] =
    orderedImages.length > 0
      ? orderedImages
      : api.thumbnailUrl
        ? [{ url: api.thumbnailUrl, category: "other" as const }]
        : [];

  const amenities = (api.listingAmenities ?? [])
    .map((a) => ({
      id: String(a.amenityId ?? a.id ?? ""),
      name: String(a.amenityName ?? a.name ?? "").trim(),
    }))
    .filter((a) => a.name);

  return {
    id: String(api.id),
    name: api.publicName || api.name || api.internalListingName || "Listing",
    description: api.description ?? "",
    bedrooms: api.bedroomsNumber ?? 0,
    bathrooms: api.bathroomsNumber ?? 0,
    maxGuests: api.personCapacity ?? 0,
    basePrice: { amount: api.price ?? 0, currency },
    cleaningFee: api.cleaningFee ?? 0,
    minNights: Math.max(1, api.minNights ?? 1),
    maxNights: api.maxNights && api.maxNights > 0 ? api.maxNights : 365,
    images,
    amenities,
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
    minimumStay:
      typeof d.minimumStay === "number" && d.minimumStay > 0
        ? d.minimumStay
        : undefined,
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
