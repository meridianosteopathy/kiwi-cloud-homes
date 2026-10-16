/**
 * Beds24 API v2 client that satisfies the site's booking-engine interface
 * (the `HostawayClient` shape every page and route is written against).
 *
 * Model mapping:
 *   Beds24 property  -> one listing on the site (listing id = property id)
 *   Beds24 room type -> the bookable unit inside it. A whole-house rental has
 *                       exactly one room type with qty 1; we use the first
 *                       sellable one and warn if there are several.
 *
 * Endpoints (official OpenAPI "API V2" 3.0.0):
 *   GET  /properties?includeAllRooms=true&includeTexts=all&includeLanguages=en
 *        &includePictures=true&includeUpsellItems=true
 *   GET  /inventory/rooms/calendar?roomId&startDate&endDate&includeNumAvail
 *        &includeMinStay&includePrices&includeOverride
 *   GET  /bookings?apiReference=...            (idempotency check)
 *   POST /bookings  [ { roomId, status, arrival, departure, ... , actions } ]
 *
 * Things Beds24 has no field for (bedroom and bathroom counts) come from the
 * per-home profile in src/content/homes.ts.
 */

import { categorizeImage } from "@/lib/photos";
import { homeProfileFor } from "@/content/homes";
import type {
  AvailabilityDay,
  HostawayClient,
  HostawayListing,
  InquiryInput,
  InquiryResult,
  ListingImage,
  ReservationInput,
  ReservationResult,
} from "@/lib/hostaway/types";
import {
  Beds24AuthError,
  clearAccessTokenCache,
  getAccessToken,
  readCredentials,
} from "./auth";
import type {
  Beds24Booking,
  Beds24CalendarRange,
  Beds24Envelope,
  Beds24Picture,
  Beds24PostResult,
  Beds24Property,
  Beds24Room,
  Beds24RoomCalendar,
  Beds24Text,
} from "./types";

const PROPERTIES_TTL_MS = 5 * 60 * 1000;
const MAX_DISCOVERED_PROPERTIES = 50;
const LOW_CREDIT_WARNING = 50;

export function createBeds24Client(): HostawayClient {
  // Fail at startup, not on the first guest request, when config is missing.
  readCredentials();

  return {
    async listListings() {
      const properties = await resolveProperties();
      const listings = properties.map(mapProperty);
      console.log(
        `[beds24] showing ${listings.length} listing(s): ${listings
          .map((l) => `${l.id} (${l.name})`)
          .join("; ")}`,
      );
      return listings;
    },

    async getListing(listingId?: string) {
      const properties = await resolveProperties();
      const property = listingId
        ? properties.find((p) => String(p.id) === String(listingId))
        : properties[0];
      if (!property) {
        throw new Beds24ApiError(
          listingId
            ? `Beds24 property ${listingId} is not one of the configured listings.`
            : "No Beds24 properties are configured for this site.",
        );
      }
      return mapProperty(property);
    },

    async isConfiguredListing(listingId) {
      const ids = (await resolveProperties()).map((p) => String(p.id));
      return ids.includes(String(listingId));
    },

    async getAvailability(listingId, start, end) {
      const property = await requireProperty(listingId);
      const room = pickRoom(property);
      const currency = property.currency || "NZD";
      const data = await apiGet<Beds24RoomCalendar[]>("/inventory/rooms/calendar", {
        roomId: room.id,
        startDate: start,
        endDate: end,
        includeNumAvail: true,
        includeMinStay: true,
        includePrices: true,
        includeOverride: true,
      });
      const ranges = (data ?? []).find((r) => Number(r.roomId) === Number(room.id))?.calendar
        ?? data?.[0]?.calendar
        ?? [];
      const fallbackPrice = room.rackRate || room.minPrice || 0;
      const days = expandCalendar(ranges, start, end, currency, fallbackPrice);
      const missing = days.filter((d) => d.missing).length;
      if (missing > 0) {
        console.warn(
          `[beds24] calendar for room ${room.id} had no entry for ${missing} of ${days.length} day(s) in ${start}..${end}; treating them as unavailable.`,
        );
      }
      return days.map(({ missing: _m, ...day }) => day);
    },

    async createInquiry(_input: InquiryInput): Promise<InquiryResult> {
      throw new Beds24NotImplementedError(
        "createInquiry is not implemented for the Beds24 client; the inquiry form uses mailto until the messaging phase ships.",
      );
    },

    async createReservation(input: ReservationInput): Promise<ReservationResult> {
      const property = await requireProperty(input.listingId);
      const room = pickRoom(property);

      // Idempotency: Stripe retries a webhook until we answer 2xx. If a
      // booking with this payment reference already exists, return it
      // instead of creating a second one.
      const existing = await findBookingByReference(property.id, input.externalRef);
      if (existing) {
        console.log(
          `[beds24] reservation for ${input.externalRef} already exists as booking ${existing.id}; not creating another.`,
        );
        return { id: String(existing.id), alreadyExisted: true };
      }

      const nights = nightsBetween(input.arrivalDate, input.departureDate);
      const total = round2(input.totalPrice);
      const body = [
        {
          roomId: room.id,
          status: "confirmed",
          arrival: input.arrivalDate,
          departure: input.departureDate,
          numAdult: input.numberOfGuests,
          numChild: 0,
          firstName: input.guestFirstName,
          lastName: input.guestLastName || input.guestFirstName,
          email: input.guestEmail,
          phone: input.guestPhone ?? "",
          lang: "en",
          price: total,
          referer: "Direct website",
          apiReference: input.externalRef,
          custom1: input.externalRef,
          notes: `Direct booking from the website. ${nights} night(s), paid ${total} ${input.currency} via Stripe (${input.externalRef}).`,
          invoiceItems: [
            {
              type: "charge",
              description: `Accommodation, ${nights} night(s), website booking`,
              qty: 1,
              amount: total,
            },
            {
              type: "payment",
              description: `Stripe payment ${input.externalRef}`,
              qty: 1,
              amount: total,
            },
          ],
          actions: {
            // Beds24 refuses the booking if the room has no availability,
            // which is our last line of defence against a double booking.
            checkAvailability: true,
            // Guests get our own Brevo confirmation; the host still gets
            // Beds24's new-booking email.
            notifyGuest: false,
            notifyHost: true,
          },
        },
      ];

      const results = await apiPost<Beds24PostResult[]>("/bookings", body);
      const first = Array.isArray(results) ? results[0] : (results as unknown as Beds24PostResult);
      if (!first || first.success === false) {
        const detail = (first?.errors ?? [])
          .map((e) => [e.field, e.message].filter(Boolean).join(": "))
          .join("; ");
        throw new Beds24ApiError(
          `Beds24 POST /bookings did not create the booking${detail ? `: ${detail}` : "."}`,
        );
      }
      for (const w of first.warnings ?? []) {
        console.warn(`[beds24] POST /bookings warning: ${w.field ?? ""} ${w.message ?? ""}`.trim());
      }
      const id = extractNewId(first);
      if (id === undefined) {
        throw new Beds24ApiError(
          `Beds24 POST /bookings succeeded but no booking id was found in the response: ${JSON.stringify(first).slice(0, 300)}`,
        );
      }
      return { id: String(id) };
    },
  };
}

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

let cachedProperties: { list: Beds24Property[]; expiresAt: number } | null = null;

/**
 * The properties this site shows, in display order.
 *   1. BEDS24_PROPERTY_IDS — comma-separated ids, pins the set and the order.
 *   2. Otherwise every property in the Beds24 account, as the API returns them.
 */
async function resolveProperties(): Promise<Beds24Property[]> {
  const now = Date.now();
  if (cachedProperties && cachedProperties.expiresAt > now) {
    return cachedProperties.list;
  }
  const pinned = parseIdList(process.env.BEDS24_PROPERTY_IDS);
  const query: Query = {
    includeAllRooms: true,
    includeTexts: "all",
    includeLanguages: "en",
    includePictures: true,
    includeUpsellItems: true,
  };
  if (pinned.length > 0) query.id = pinned;

  const data = (await apiGet<Beds24Property[]>("/properties", query)) ?? [];
  if (!Array.isArray(data) || data.length === 0) {
    throw new Beds24ApiError(
      pinned.length > 0
        ? `Beds24 returned none of the pinned properties (${pinned.join(", ")}). Check BEDS24_PROPERTY_IDS and the token's property access.`
        : "Beds24 GET /properties returned no properties. Add a property to the account, or check the token's property access.",
    );
  }

  let list = data.slice(0, MAX_DISCOVERED_PROPERTIES);
  if (pinned.length > 0) {
    // Keep the pinned order and drop anything the API returned that was not asked for.
    const byId = new Map(list.map((p) => [String(p.id), p]));
    list = pinned.map((id) => byId.get(id)).filter((p): p is Beds24Property => Boolean(p));
    const missing = pinned.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      console.error(
        `[beds24] pinned property id(s) not returned by Beds24 and hidden from the site: ${missing.join(", ")}`,
      );
    }
  }
  console.log(
    `[beds24] GET /properties returned ${list.length} propert${list.length === 1 ? "y" : "ies"}: ${list
      .map((p) => `${p.id} (${p.name ?? "unnamed"})`)
      .join("; ")}${pinned.length > 0 ? " (pinned via BEDS24_PROPERTY_IDS)" : ""}`,
  );
  cachedProperties = {
    list,
    expiresAt: now + (pinned.length > 0 ? Number.POSITIVE_INFINITY : PROPERTIES_TTL_MS),
  };
  return list;
}

async function requireProperty(listingId: string): Promise<Beds24Property> {
  const property = (await resolveProperties()).find((p) => String(p.id) === String(listingId));
  if (!property) {
    throw new Beds24ApiError(`Beds24 property ${listingId} is not one of the configured listings.`);
  }
  return property;
}

/** The bookable room type of a property: the first one that can be sold. */
export function pickRoom(property: Beds24Property): Beds24Room {
  const rooms = (property.roomTypes ?? []).filter((r) => r && typeof r.id === "number");
  if (rooms.length === 0) {
    throw new Beds24ApiError(
      `Beds24 property ${property.id} (${property.name ?? "unnamed"}) has no room types; the site cannot price or book it.`,
    );
  }
  const sellable = rooms.filter((r) => (r.qty ?? 1) > 0 && r.sellPriority !== null);
  const candidates = sellable.length > 0 ? sellable : rooms;
  if (candidates.length > 1) {
    console.warn(
      `[beds24] property ${property.id} has ${candidates.length} room types; using the first (${candidates[0].id} ${candidates[0].name ?? ""}). A whole-house listing should have one.`,
    );
  }
  return candidates[0];
}

export function mapProperty(property: Beds24Property): HostawayListing {
  const room = pickRoom(property);
  const currency = property.currency || "NZD";
  const id = String(property.id);
  const name = property.name?.trim() || room.name?.trim() || "Listing";
  const profile = homeProfileFor({ id, name });

  const images = extractPictures(property, room);
  const fallbackImages: ListingImage[] = (profile?.images ?? [])
    .filter((i) => i.url)
    .map((i) => ({
      url: i.url,
      caption: i.caption ?? "",
      category: categorizeImage(i.caption),
    }));

  const codes = uniqueCodes([...(property.featureCodes ?? []), ...(room.featureCodes ?? [])]);
  const amenities = codes.map((code) => ({ id: code, name: humanizeFeatureCode(code) }));

  const cleaningFromUpsell = (property.upsellItems ?? []).find(
    (u) => u.enable !== false && u.type === "obligatoryCleaning" && typeof u.amount === "number",
  )?.amount;

  return {
    id,
    name,
    description: pickDescription(property.texts) || pickDescription(room.texts) || "",
    bedrooms: profile?.bedrooms ?? 0,
    bathrooms: profile?.bathrooms ?? 0,
    maxGuests: room.maxPeople ?? room.maxAdult ?? 0,
    basePrice: { amount: room.rackRate || room.minPrice || 0, currency },
    cleaningFee: room.cleaningFee && room.cleaningFee > 0 ? room.cleaningFee : cleaningFromUpsell ?? 0,
    minNights: Math.max(1, room.minStay ?? 1),
    maxNights: room.maxStay && room.maxStay > 0 ? room.maxStay : 365,
    images: images.length > 0 ? images : fallbackImages,
    amenities,
    address: {
      line1: property.address?.trim() || "—",
      city: property.city ?? "",
      region: property.state ?? "",
      country: countryName(property.country),
    },
  };
}

/** English text first; the longest description-like field wins. */
export function pickDescription(texts: Beds24Text[] | undefined): string {
  if (!texts || texts.length === 0) return "";
  const ordered = [...texts].sort((a, b) => {
    const la = String(a.language ?? "").toLowerCase() === "en" ? 0 : 1;
    const lb = String(b.language ?? "").toLowerCase() === "en" ? 0 : 1;
    return la - lb;
  });
  for (const t of ordered) {
    const candidates = Object.entries(t)
      .filter(([key, value]) => /description/i.test(key) && typeof value === "string" && value.trim())
      .map(([, value]) => (value as string).trim())
      .sort((a, b) => b.length - a.length);
    if (candidates.length > 0) return candidates[0];
    if (typeof t.headline === "string" && t.headline.trim()) return t.headline.trim();
  }
  return "";
}

/** Pictures are not in the public spec, so accept the common shapes. */
export function extractPictures(property: Beds24Property, room: Beds24Room): ListingImage[] {
  const sources: unknown[] = [
    property.pictures,
    property.images,
    room.pictures,
    room.images,
  ];
  for (const source of sources) {
    if (!Array.isArray(source) || source.length === 0) continue;
    const images = source
      .map((raw) => {
        if (typeof raw === "string") return { url: raw, caption: "" };
        const pic = raw as Beds24Picture;
        const url = [pic.url, pic.large, pic.original, pic.src].find(
          (v) => typeof v === "string" && /^https?:\/\//i.test(v),
        );
        if (!url) return null;
        const caption = [pic.caption, pic.description, pic.text, pic.alt].find(
          (v) => typeof v === "string" && v.trim(),
        ) as string | undefined;
        return { url, caption: caption?.trim() ?? "" };
      })
      .filter((i): i is { url: string; caption: string } => Boolean(i))
      .map((i) => ({ url: i.url, caption: i.caption, category: categorizeImage(i.caption) }));
    if (images.length > 0) return images;
  }
  return [];
}

function uniqueCodes(groups: string[][]): string[] {
  const seen = new Set<string>();
  for (const group of groups) {
    for (const code of Array.isArray(group) ? group : [group]) {
      const c = String(code ?? "").trim();
      if (c) seen.add(c);
    }
  }
  return [...seen];
}

/** "FREE_WIFI" -> "Free wifi", "airConditioning" -> "Air conditioning". */
export function humanizeFeatureCode(code: string): string {
  const spaced = code
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .trim()
    .toLowerCase();
  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : code;
}

const COUNTRY_NAMES: Record<string, string> = {
  NZ: "New Zealand",
  AU: "Australia",
  GB: "United Kingdom",
  US: "United States",
  CN: "China",
};

function countryName(code: string | undefined): string {
  if (!code) return "";
  const upper = code.trim().toUpperCase();
  return COUNTRY_NAMES[upper] ?? code.trim();
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

type ExpandedDay = AvailabilityDay & { missing: boolean };

/**
 * Beds24 returns the calendar as date ranges (`from`..`to`, both inclusive)
 * with the same values. Expand to one entry per day across start..end
 * (inclusive, matching what the quote code expects). A day with no range is
 * marked missing and unavailable: better to refuse a booking than to sell a
 * night we know nothing about.
 */
export function expandCalendar(
  ranges: Beds24CalendarRange[],
  start: string,
  end: string,
  currency: string,
  fallbackPrice: number,
): ExpandedDay[] {
  const byDate = new Map<string, Beds24CalendarRange>();
  for (const range of ranges ?? []) {
    if (!range?.from) continue;
    const to = range.to || range.from;
    for (const date of dateRange(range.from, to)) {
      // Later ranges win if Beds24 ever overlaps them; it normally does not.
      byDate.set(date, range);
    }
  }
  return dateRange(start, end).map<ExpandedDay>((date) => {
    const range = byDate.get(date);
    if (!range) {
      return {
        date,
        available: false,
        price: { amount: fallbackPrice, currency },
        missing: true,
      };
    }
    const numAvail = typeof range.numAvail === "number" ? range.numAvail : 0;
    const blackout = range.override === "blackout";
    const price =
      typeof range.price1 === "number" && range.price1 > 0 ? range.price1 : fallbackPrice;
    return {
      date,
      available: numAvail > 0 && !blackout,
      price: { amount: price, currency },
      minimumStay:
        typeof range.minStay === "number" && range.minStay > 0 ? range.minStay : undefined,
      missing: false,
    };
  });
}

function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
    if (out.length > 1000) break; // guard against a runaway range
  }
  return out;
}

function nightsBetween(arrivalISO: string, departureISO: string): number {
  const a = new Date(arrivalISO + "T00:00:00Z").getTime();
  const b = new Date(departureISO + "T00:00:00Z").getTime();
  const n = Math.round((b - a) / 86_400_000);
  return n > 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

async function findBookingByReference(
  propertyId: number,
  reference: string,
): Promise<Beds24Booking | undefined> {
  const live = ["confirmed", "new", "request"];
  try {
    const byRef = await apiGet<Beds24Booking[]>("/bookings", {
      propertyId,
      apiReference: reference,
      status: live,
    });
    const hit = (byRef ?? []).find((b) => b.apiReference === reference);
    if (hit) return hit;
    // Fallback in case apiReference was not stored on creation: searchString
    // matches guest name, email, api reference and booking id.
    const bySearch = await apiGet<Beds24Booking[]>("/bookings", {
      propertyId,
      searchString: reference,
      status: live,
    });
    return (bySearch ?? []).find((b) => b.apiReference === reference);
  } catch (err) {
    // A failed lookup must not block the booking; log and continue.
    console.warn(
      `[beds24] idempotency lookup for ${reference} failed; continuing to create:`,
      err instanceof Error ? err.message : err,
    );
    return undefined;
  }
}

function extractNewId(result: Beds24PostResult): number | string | undefined {
  const fresh = result.new ?? result.modified;
  if (fresh === undefined || fresh === null) return undefined;
  if (typeof fresh === "number") return fresh;
  if (Array.isArray(fresh)) return fresh[0];
  if (typeof fresh === "object" && typeof fresh.id !== "undefined") return fresh.id as number;
  return undefined;
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

type QueryValue = string | number | boolean | Array<string | number>;
type Query = Record<string, QueryValue | undefined>;

function parseIdList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (id) seen.add(id);
  }
  return [...seen];
}

function buildQuery(query: Query | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, String(v));
    } else {
      params.append(key, String(value));
    }
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

async function apiGet<T>(path: string, query?: Query): Promise<T | undefined> {
  const envelope = await apiRequest<Beds24Envelope<T>>("GET", path, query);
  if (envelope && typeof envelope === "object" && "success" in envelope && envelope.success === false) {
    throw new Beds24ApiError(
      `Beds24 GET ${path} failed: ${envelope.error ?? "unknown error"} (code ${envelope.code ?? "?"})`,
    );
  }
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    if (envelope.pages?.nextPageExists) {
      console.warn(`[beds24] GET ${path} has more pages than the site reads; only the first page is used.`);
    }
    return envelope.data;
  }
  // Some endpoints return bare arrays.
  return envelope as unknown as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>("POST", path, undefined, body);
}

async function apiRequest<T>(
  method: "GET" | "POST",
  path: string,
  query?: Query,
  body?: unknown,
): Promise<T> {
  const creds = readCredentials();
  const url = `${creds.apiBase}${path}${buildQuery(query)}`;

  const send = async (token: string): Promise<Response> =>
    fetch(url, {
      method,
      headers: {
        token,
        accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

  let res = await send(await getAccessToken());
  if (res.status === 401) {
    clearAccessTokenCache();
    let token: string;
    try {
      token = await getAccessToken(true);
    } catch (err) {
      throw new Beds24AuthError(
        `Beds24 401 then re-auth failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    res = await send(token);
  }

  const remaining = Number(res.headers.get("x-five-min-limit-remaining"));
  if (Number.isFinite(remaining) && remaining > 0 && remaining < LOW_CREDIT_WARNING) {
    console.warn(`[beds24] only ${remaining} API credits left in this five-minute window.`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Beds24ApiError(
      `Beds24 ${method} ${path} failed: ${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 300)}` : ""}`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Beds24ApiError(`Beds24 ${method} ${path} returned a non-JSON body: ${text.slice(0, 200)}`);
  }
}

export class Beds24ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Beds24ApiError";
  }
}

export class Beds24NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Beds24NotImplementedError";
  }
}
