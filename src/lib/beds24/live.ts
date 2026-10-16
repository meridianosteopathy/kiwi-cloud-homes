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
 *        &includeLanguages=zh&includePictures=true&includeUpsellItems=true
 *        &includePriceRules=true            (paginated; all pages are read)
 *   GET  /inventory/rooms/calendar?roomId&startDate&endDate&includeNumAvail
 *        &includeMinStay&includePrices&includeOverride   (all pages; also
 *        read 90 days ahead for the card's "from" price)
 *   GET  /bookings?roomId&arrival&status=...  (idempotency check, matched on
 *        custom1 = Stripe PaymentIntent id; apiReference is read-only)
 *   POST /bookings  [ { roomId, status, arrival, departure, ... , actions } ]
 *
 * Beds24 reports most errors as HTTP 400 with {"success": false, "error"}:
 * an expired token can arrive that way rather than as 401, so auth retries
 * key off the body as well as the status (see auth.ts).
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
import { ReservationRejectedError } from "@/lib/hostaway/errors";
import {
  Beds24AuthError,
  clearAccessTokenCache,
  getAccessToken,
  looksLikeAuthFailure,
  readCredentials,
} from "./auth";
import type {
  Beds24Booking,
  Beds24CalendarRange,
  Beds24Envelope,
  Beds24Picture,
  Beds24PostResult,
  Beds24PriceRule,
  Beds24Property,
  Beds24Room,
  Beds24RoomCalendar,
  Beds24Text,
} from "./types";

const PROPERTIES_TTL_MS = 5 * 60 * 1000;
const HEADLINE_LOOKAHEAD_DAYS = 90;
const MAX_DISCOVERED_PROPERTIES = 50;
const MAX_PAGES = 10;
const LOW_CREDIT_WARNING = 50;
const WEBSITE_REFERER = "Kiwi Cloud Homes website";
const ALL_BOOKING_STATUSES = ["confirmed", "new", "request", "black", "inquiry", "cancelled"];

export function createBeds24Client(): HostawayClient {
  // Fail at startup, not on the first guest request, when config is missing.
  readCredentials();

  return {
    async listListings() {
      const properties = await resolveProperties();
      const listings = await Promise.all(properties.map(toListing));
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
      return toListing(property);
    },

    async isConfiguredListing(listingId) {
      const ids = (await resolveProperties()).map((p) => String(p.id));
      return ids.includes(String(listingId));
    },

    async getAvailability(listingId, start, end) {
      const property = await requireProperty(listingId);
      const room = pickRoom(property);
      const currency = property.currency || "NZD";
      const ranges = await fetchCalendarRanges(room.id, start, end);
      const days = expandCalendar(ranges, start, end, currency, room.rackRate || room.minPrice || 0, {
        priceSlot: priceSlotFor(room),
        today: todayInNewZealand(),
      });
      const missing = days.filter((d) => d.missing).length;
      const unpriced = days.filter((d) => !d.missing && d.unpriced).length;
      if (missing > 0 || unpriced > 0) {
        console.warn(
          `[beds24] calendar for room ${room.id} in ${start}..${end}: ${missing} day(s) had no entry and ${unpriced} had no price in slot ${priceSlotFor(room)}; those days are not for sale.`,
        );
      }
      return days.map(({ missing: _m, unpriced: _u, ...day }) => day);
    },

    async createInquiry(_input: InquiryInput): Promise<InquiryResult> {
      throw new Beds24NotImplementedError(
        "createInquiry is not implemented for the Beds24 client; the inquiry form uses mailto until the messaging phase ships.",
      );
    },

    async createReservation(input: ReservationInput): Promise<ReservationResult> {
      const property = await requireProperty(input.listingId);
      const room = pickRoom(property);
      const currency = property.currency || "NZD";
      if (input.currency && input.currency.toUpperCase() !== currency.toUpperCase()) {
        // The guest paid in one currency and Beds24 keeps the property in
        // another; writing the number across would misstate the price.
        throw new ReservationRejectedError(
          "currency_mismatch",
          `Payment ${input.externalRef} is in ${input.currency} but Beds24 property ${property.id} is priced in ${currency}; not creating the booking.`,
        );
      }

      // Idempotency: Stripe retries a webhook until we answer 2xx. If a
      // booking carrying this payment reference already exists (even a
      // cancelled one), return it instead of creating a second booking.
      // A failed lookup throws so Stripe retries later: a duplicate booking
      // is worse than a delayed one.
      const existing = await findBookingByReference(room.id, input.arrivalDate, input.externalRef);
      if (existing) {
        console.log(
          `[beds24] reservation for ${input.externalRef} already exists as booking ${existing.id} (${existing.status ?? "?"}); not creating another.`,
        );
        return { id: String(existing.id), alreadyExisted: true };
      }

      const nights = nightsBetween(input.arrivalDate, input.departureDate);
      const total = round2(input.totalPrice);
      const cleaning = cleaningFeeFor(property, room);
      const accommodation = cleaning > 0 && cleaning < total ? round2(total - cleaning) : total;
      const maxPeople = room.maxPeople ?? room.maxAdult ?? 0;
      const numAdult = Math.max(1, maxPeople > 0 ? Math.min(input.numberOfGuests, maxPeople) : input.numberOfGuests);
      if (numAdult !== input.numberOfGuests) {
        console.warn(
          `[beds24] guest count ${input.numberOfGuests} clamped to ${numAdult} for room ${room.id} (max ${maxPeople || "unknown"}).`,
        );
      }

      const invoiceItems: Array<{ type: "charge" | "payment"; description: string; qty: number; amount: number }> = [
        {
          type: "charge",
          description: `Accommodation, ${nights} night(s), website booking`,
          qty: 1,
          amount: accommodation,
        },
      ];
      if (accommodation !== total) {
        invoiceItems.push({ type: "charge", description: "Cleaning fee", qty: 1, amount: cleaning });
      }
      invoiceItems.push({
        type: "payment",
        description: `Stripe payment ${input.externalRef}`,
        qty: 1,
        amount: total,
      });

      const body = [
        {
          roomId: room.id,
          status: "confirmed",
          arrival: input.arrivalDate,
          departure: input.departureDate,
          numAdult,
          numChild: 0,
          // Beds24 caps these at 100 characters (notes at 2000). A single-name
          // guest keeps an empty last name rather than a duplicated first name.
          firstName: clip(input.guestFirstName, 100),
          lastName: clip(input.guestLastName ?? "", 100),
          email: input.guestEmail,
          phone: clip(input.guestPhone ?? "", 100),
          lang: "en",
          price: total,
          // `referer` and `apiReference` are read-only on the API; the
          // writable source label is refererEditable, and custom1 carries
          // the Stripe PaymentIntent id so a retry can find this booking.
          refererEditable: WEBSITE_REFERER,
          custom1: clip(input.externalRef, 1000),
          notes: clip(
            `Direct booking from the website. ${nights} night(s), paid ${total} ${currency} via Stripe (${input.externalRef}).`,
            2000,
          ),
          invoiceItems,
          actions: {
            // Beds24 refuses the booking if the room has no availability,
            // which is our last line of defence against a double booking.
            checkAvailability: true,
            // Guests get our own Brevo confirmation; the host still gets
            // Beds24's new-booking email.
            notifyGuest: false,
            notifyHost: true,
            // Let this booking fire the account's Beds24 webhooks (our
            // future receiver) on status, date or room changes, like any
            // other new booking. Channel-manager sync to Airbnb and
            // Booking.com is independent of this flag; DEPLOY.md has the
            // owner check it by hand on the first live booking.
            allowWebhooks: true,
          },
        },
      ];

      let first: Beds24PostResult | undefined;
      try {
        const results = await apiPost<Beds24PostResult[]>("/bookings", body);
        first = Array.isArray(results) ? results[0] : (results as unknown as Beds24PostResult);
      } catch (err) {
        // The request may have been applied even though the response was
        // lost (timeout, proxy error). Look once more before giving up.
        const created = await findBookingByReference(room.id, input.arrivalDate, input.externalRef).catch(
          () => undefined,
        );
        if (created) {
          console.warn(
            `[beds24] POST /bookings threw but booking ${created.id} exists for ${input.externalRef}; returning it.`,
          );
          return { id: String(created.id) };
        }
        throw err;
      }

      if (!first || first.success === false) {
        const detail = (first?.errors ?? [])
          .map((e) => [e.field, e.message].filter(Boolean).join(": "))
          .join("; ");
        const message = `Beds24 POST /bookings did not create the booking${detail ? `: ${detail}` : "."}`;
        if (/availab|not available|no longer available|overbook/i.test(detail)) {
          // The unit may be occupied by the booking this very payment created
          // on a concurrent delivery of the same Stripe event. Look once more
          // before telling the owner to refund anyone; a failed lookup throws
          // and Stripe retries later.
          const existing = await findBookingByReference(room.id, input.arrivalDate, input.externalRef);
          if (existing) {
            console.warn(
              `[beds24] POST /bookings was refused for availability but booking ${existing.id} already carries ${input.externalRef}; returning it.`,
            );
            return { id: String(existing.id), alreadyExisted: true };
          }
          throw new Beds24UnavailableError(message);
        }
        throw new Beds24ApiError(message);
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
 * Either way the property data (cleaning fee, capacity, texts, price rules)
 * is re-read every five minutes, so a change made in Beds24 shows up without
 * a redeploy.
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
    includeLanguages: ["en", "zh"],
    includePictures: true,
    includeUpsellItems: true,
    includePriceRules: true,
  };
  if (pinned.length > 0) query.id = pinned;

  const data = await apiGetAllPages<Beds24Property>("/properties", query);
  if (data.length === 0) {
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
  cachedProperties = { list, expiresAt: now + PROPERTIES_TTL_MS };
  return list;
}

/** A property as the site shows it, with the headline price taken from the calendar. */
async function toListing(property: Beds24Property): Promise<HostawayListing> {
  const listing = mapProperty(property);
  const room = pickRoom(property);
  const headline = await headlinePriceFor(property, room);
  if (headline !== null) {
    listing.basePrice = { ...listing.basePrice, amount: headline };
  } else if (listing.basePrice.amount <= 0 && !warnedZeroPrice.has(property.id)) {
    console.warn(
      `[beds24] property ${property.id} has no upcoming price in slot ${priceSlotFor(room)} and no rack rate; the card will show 0.`,
    );
    warnedZeroPrice.add(property.id);
  }
  return listing;
}

const warnedZeroPrice = new Set<number>();

const headlineCache = new Map<number, { amount: number | null; expiresAt: number }>();

/**
 * The "from" price on the property card: the lowest price in the sold slot
 * over the next 90 nights. rackRate and minPrice are unrelated room fields
 * that are often unset, which would print "0 per night"; this is display
 * only, every quote prices the actual nights.
 */
async function headlinePriceFor(property: Beds24Property, room: Beds24Room): Promise<number | null> {
  const now = Date.now();
  const hit = headlineCache.get(property.id);
  if (hit && hit.expiresAt > now) return hit.amount;
  let amount: number | null = null;
  try {
    const today = todayInNewZealand();
    const ranges = await fetchCalendarRanges(room.id, today, addDays(today, HEADLINE_LOOKAHEAD_DAYS));
    const key = `price${priceSlotFor(room)}`;
    const prices = ranges
      .map((r) => r[key])
      .filter((p): p is number => typeof p === "number" && Number.isFinite(p) && p > 0);
    amount = prices.length > 0 ? Math.min(...prices) : null;
  } catch (err) {
    console.warn(
      `[beds24] could not read upcoming prices for property ${property.id}:`,
      err instanceof Error ? err.message : err,
    );
  }
  headlineCache.set(property.id, { amount, expiresAt: now + PROPERTIES_TTL_MS });
  return amount;
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
  if (sellable.length === 0 && !warnedHidden.has(property.id)) {
    console.warn(
      `[beds24] property ${property.id} has no sellable room type (all hidden from the booking page or with 0 units); selling room ${rooms[0].id} anyway. Unhide it in Beds24 if this is unintended.`,
    );
    warnedHidden.add(property.id);
  }
  const candidates = sellable.length > 0 ? sellable : rooms;
  if (candidates.length > 1 && !warnedRooms.has(property.id)) {
    console.warn(
      `[beds24] property ${property.id} has ${candidates.length} room types; using the first (${candidates[0].id} ${candidates[0].name ?? ""}). A whole-house listing should have one.`,
    );
    warnedRooms.add(property.id);
  }
  return candidates[0];
}

const warnedRooms = new Set<number>();
const warnedHidden = new Set<number>();

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

  return {
    id,
    name,
    description: pickDescription(property.texts) || pickDescription(room.texts) || "",
    bedrooms: profile?.bedrooms ?? 0,
    bathrooms: profile?.bathrooms ?? 0,
    maxGuests: room.maxPeople ?? room.maxAdult ?? 0,
    basePrice: { amount: room.rackRate || room.minPrice || 0, currency },
    cleaningFee: cleaningFeeFor(property, room),
    minNights: Math.max(1, room.minStay ?? 1),
    maxNights: room.maxStay && room.maxStay > 0 ? room.maxStay : 365,
    ...(room.restrictionStrategy === "firstNight" || room.restrictionStrategy === "stayThrough"
      ? { minStayStrategy: room.restrictionStrategy }
      : {}),
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

/**
 * The cleaning fee a direct booking pays. Beds24's own booking page charges
 * the property's enabled one-off "obligatoryCleaning" upsell item(s), so
 * that is what the site mirrors; the room-level cleaningFee (what the
 * channel manager pushes to Airbnb and the like) is the fallback.
 */
export function cleaningFeeFor(property: Beds24Property, room: Beds24Room): number {
  warnAboutUnmodelledFees(property);
  const upsell = (property.upsellItems ?? [])
    .filter(
      (u) =>
        u.enable === true &&
        u.type === "obligatoryCleaning" &&
        typeof u.amount === "number" &&
        u.amount > 0 &&
        (u.per === undefined || u.per === "booking" || u.per === "room") &&
        (u.period === undefined || u.period === "oneTime"),
    )
    .reduce((sum, u) => sum + (u.amount ?? 0), 0);
  if (upsell > 0) return round2(upsell);
  return room.cleaningFee && room.cleaningFee > 0 ? room.cleaningFee : 0;
}

const warnedFees = new Set<number>();

/**
 * The site charges nightly prices plus a flat cleaning fee. Any other
 * compulsory upsell item (a per-person charge, a daily fee, a percentage
 * tax) is not collected, so say so once per property for the trial log.
 */
function warnAboutUnmodelledFees(property: Beds24Property): void {
  if (warnedFees.has(property.id)) return;
  const ignored = (property.upsellItems ?? []).filter(
    (u) =>
      u.enable === true &&
      typeof u.type === "string" &&
      /^obligatory/.test(u.type) &&
      !(
        u.type === "obligatoryCleaning" &&
        (u.per === undefined || u.per === "booking" || u.per === "room") &&
        (u.period === undefined || u.period === "oneTime")
      ),
  );
  if (ignored.length > 0) {
    console.warn(
      `[beds24] property ${property.id} has compulsory upsell item(s) the site does not charge: ${ignored
        .map((u) => `${u.type} ${u.amount ?? "?"} per ${u.per ?? "booking"} ${u.period ?? "oneTime"}`)
        .join("; ")}. Fold them into the nightly price or the cleaning fee.`,
    );
  }
  warnedFees.add(property.id);
}

const warnedSlots = new Set<number>();

/**
 * Which of the room's 16 price slots the site sells.
 *   BEDS24_PRICE_SLOT=n  pins it (1..16).
 *   Otherwise the first price rule that is enabled for the direct booking page.
 *   Otherwise slot 1.
 */
export function priceSlotFor(room: Beds24Room): number {
  const fromEnv = Number.parseInt(process.env.BEDS24_PRICE_SLOT ?? "", 10);
  if (Number.isInteger(fromEnv) && fromEnv >= 1 && fromEnv <= 16) return fromEnv;
  const direct = (room.priceRules ?? []).find(
    (r) => r?.bookingPage?.direct === true && Number.isInteger(r.id) && (r.id as number) >= 1 && (r.id as number) <= 16,
  );
  const slot = direct?.id ?? 1;
  const rule = (room.priceRules ?? []).find((r) => r?.id === slot);
  if (rule && !warnedSlots.has(room.id)) {
    const conditions = describeRuleConditions(rule);
    if (conditions.length > 0) {
      console.warn(
        `[beds24] room ${room.id} price slot ${slot} ("${rule.name ?? ""}") has conditions the site does not apply (${conditions.join(
          ", ",
        )}); every stay is sold at that slot's nightly price.`,
      );
    }
    warnedSlots.add(room.id);
  }
  return slot;
}

/** The conditions on a Beds24 price rule that the site's flat nightly pricing ignores. */
export function describeRuleConditions(rule: Beds24PriceRule): string[] {
  const out: string[] = [];
  if (typeof rule.minimumStay === "number" && rule.minimumStay > 1) out.push(`minimum stay ${rule.minimumStay}`);
  if (typeof rule.maximumStay === "number" && rule.maximumStay > 0 && rule.maximumStay < 365) out.push(`maximum stay ${rule.maximumStay}`);
  if (typeof rule.minDaysUntilCheckin === "number" && rule.minDaysUntilCheckin > 0) out.push(`at least ${rule.minDaysUntilCheckin} days before check-in`);
  if (typeof rule.maxDaysUntilCheckin === "number" && rule.maxDaysUntilCheckin > 0) out.push(`at most ${rule.maxDaysUntilCheckin} days before check-in`);
  const priceFor = rule.priceFor?.type;
  if (priceFor === "perPerson") out.push("priced per person");
  if (priceFor === "upToPerson") out.push(`priced up to ${rule.priceFor?.upToPersonValue ?? "?"} guest(s)`);
  if (typeof rule.extraPerson === "number" && rule.extraPerson > 0) out.push(`extra person ${rule.extraPerson}`);
  return out;
}

/**
 * Description text. English first (then any other language), and within a
 * language: the main property description, then its two-part variant, then
 * the longest other description-like field (booking-page copies, room
 * descriptions), then the headline. HTML from the Beds24 editor is stripped.
 */
export function pickDescription(texts: Beds24Text[] | undefined): string {
  if (!texts || texts.length === 0) return "";
  const ordered = [...texts].sort((a, b) => {
    const la = String(a.language ?? "").toLowerCase() === "en" ? 0 : 1;
    const lb = String(b.language ?? "").toLowerCase() === "en" ? 0 : 1;
    return la - lb;
  });
  for (const t of ordered) {
    const main = asText(t.propertyDescription);
    if (main) return main;
    const parts = [asText(t.propertyDescription1), asText(t.propertyDescription2)].filter(Boolean);
    if (parts.length > 0) return parts.join("\n\n");
    const others = Object.entries(t)
      .filter(([key, value]) => /description/i.test(key) && typeof value === "string")
      .map(([, value]) => asText(value as string))
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);
    if (others.length > 0) return others[0];
    const headline = asText(t.headline);
    if (headline) return headline;
  }
  return "";
}

/** Plain text from a Beds24 text field: tags removed, entities decoded, whitespace tidied. */
export function stripHtml(raw: string | undefined | null): string {
  if (!raw) return "";
  return raw
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function asText(value: unknown): string {
  return typeof value === "string" ? stripHtml(value) : "";
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

type ExpandedDay = AvailabilityDay & { missing: boolean; unpriced: boolean };

export interface ExpandCalendarOptions {
  /** 1..16, which `price<n>` field to sell. Default 1. */
  priceSlot?: number;
  /** YYYY-MM-DD; days before it are never for sale. Default: no cut-off. */
  today?: string;
}

/**
 * Beds24 returns the calendar as date ranges (`from`..`to`, both inclusive)
 * with the same values. Expand to one entry per day across start..end
 * (inclusive, matching what the quote code expects).
 *
 * A day is for sale only when Beds24 says a unit is free, the day is not
 * blacked out, it is not in the past, and the chosen price slot has a
 * price. A day with no range at all, or with no price, is marked and made
 * unavailable: better to refuse a booking than to sell a night we know
 * nothing about. The fallback price is only ever shown, never charged.
 * Per-day minStay/maxStay and the noCheckIn / noCheckOut overrides are
 * carried through for the quote to apply.
 */
export function expandCalendar(
  ranges: Beds24CalendarRange[],
  start: string,
  end: string,
  currency: string,
  fallbackPrice: number,
  options: ExpandCalendarOptions = {},
): ExpandedDay[] {
  const slot = options.priceSlot && options.priceSlot >= 1 && options.priceSlot <= 16 ? options.priceSlot : 1;
  const priceKey = `price${slot}`;
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
    const past = Boolean(options.today) && date < (options.today as string);
    const range = byDate.get(date);
    if (!range) {
      return {
        date,
        available: false,
        price: { amount: fallbackPrice, currency },
        missing: true,
        unpriced: true,
      };
    }
    const numAvail = typeof range.numAvail === "number" ? range.numAvail : 0;
    const override = String(range.override ?? "none");
    const blackout = override === "blackout";
    const noCheckIn = override === "noCheckIn" || override === "noCheckInOrCheckOut";
    const noCheckOut = override === "noCheckOut" || override === "noCheckInOrCheckOut";
    const rawPrice = range[priceKey];
    const priced = typeof rawPrice === "number" && Number.isFinite(rawPrice) && rawPrice > 0;
    return {
      date,
      available: numAvail > 0 && !blackout && priced && !past,
      price: { amount: priced ? (rawPrice as number) : fallbackPrice, currency },
      minimumStay:
        typeof range.minStay === "number" && range.minStay > 0 ? range.minStay : undefined,
      ...(typeof range.maxStay === "number" && range.maxStay > 0 ? { maximumStay: range.maxStay } : {}),
      ...(noCheckIn ? { noCheckIn: true } : {}),
      ...(noCheckOut ? { noCheckOut: true } : {}),
      missing: false,
      unpriced: !priced,
    };
  });
}

/** Today's date in New Zealand, where the houses are. */
export function todayInNewZealand(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Pacific/Auckland",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Every calendar range Beds24 holds for a room between two dates, across pages. */
async function fetchCalendarRanges(roomId: number, start: string, end: string): Promise<Beds24CalendarRange[]> {
  const data = await apiGetAllPages<Beds24RoomCalendar>("/inventory/rooms/calendar", {
    roomId,
    startDate: start,
    endDate: end,
    includeNumAvail: true,
    includeMinStay: true,
    includeMaxStay: true,
    includePrices: true,
    includeOverride: true,
  });
  const mine = data.filter((r) => Number(r.roomId) === Number(roomId));
  return (mine.length > 0 ? mine : data).flatMap((r) => r.calendar ?? []);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function clip(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
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

/**
 * Finds the booking we created for a Stripe payment, if any. `apiReference`
 * cannot be set through the API, so the PaymentIntent id lives in custom1
 * and the lookup narrows by room and arrival date, then matches custom1.
 * Cancelled bookings are included: a cancelled booking still means the
 * payment was already handled once. Throws when Beds24 cannot be asked.
 */
async function findBookingByReference(
  roomId: number,
  arrival: string,
  reference: string,
): Promise<Beds24Booking | undefined> {
  const bookings = await apiGetAllPages<Beds24Booking>("/bookings", {
    roomId,
    arrival,
    status: ALL_BOOKING_STATUSES,
  });
  return bookings.find((b) => typeof b.custom1 === "string" && b.custom1.trim() === reference);
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

/** Arrays become repeated keys (`status=new&status=request`), as the spec's form style expects. */
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

/** One page of a list endpoint, unwrapped from the Beds24 envelope. */
async function apiGet<T>(path: string, query?: Query): Promise<T | undefined> {
  const envelope = await apiRequest<Beds24Envelope<T>>("GET", path, query);
  return unwrap(envelope, path).data;
}

/** Every page of a list endpoint, following `pages.nextPageExists` up to MAX_PAGES. */
async function apiGetAllPages<T>(path: string, query: Query = {}): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const envelope = await apiRequest<Beds24Envelope<T[]>>("GET", path, { ...query, page });
    const { data, nextPageExists } = unwrap(envelope, path);
    if (Array.isArray(data)) out.push(...data);
    if (!nextPageExists) return out;
    if (page === MAX_PAGES) {
      console.warn(`[beds24] GET ${path} has more than ${MAX_PAGES} pages; the rest were not read.`);
    }
  }
  return out;
}

function unwrap<T>(envelope: Beds24Envelope<T> | T, path: string): { data: T | undefined; nextPageExists: boolean } {
  if (envelope && typeof envelope === "object" && "success" in envelope && (envelope as Beds24Envelope<T>).success === false) {
    const e = envelope as Beds24Envelope<T>;
    throw new Beds24ApiError(`Beds24 GET ${path} failed: ${e.error ?? "unknown error"} (code ${e.code ?? "?"})`);
  }
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    const e = envelope as Beds24Envelope<T>;
    return { data: e.data, nextPageExists: e.pages?.nextPageExists === true };
  }
  // Some endpoints return bare arrays.
  return { data: envelope as T, nextPageExists: false };
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

  const send = async (token: string): Promise<{ res: Response; text: string }> => {
    const res = await fetch(url, {
      method,
      headers: {
        token,
        accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    return { res, text: await res.text() };
  };

  let { res, text } = await send(await getAccessToken());
  if (looksLikeAuthFailure(res.status, text) && !creds.refreshToken) {
    // A static BEDS24_TOKEN cannot be renewed; resending it would fail the same way.
    throw new Beds24AuthError(
      `Beds24 rejected BEDS24_TOKEN (${res.status}): ${text.slice(0, 200)}. Long-life tokens are read-only and cannot be refreshed; use BEDS24_REFRESH_TOKEN for production.`,
    );
  }
  if (looksLikeAuthFailure(res.status, text)) {
    clearAccessTokenCache();
    let token: string;
    try {
      token = await getAccessToken(true);
    } catch (err) {
      throw new Beds24AuthError(
        `Beds24 rejected the access token (${res.status}) and re-authentication failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    ({ res, text } = await send(token));
    if (looksLikeAuthFailure(res.status, text)) {
      throw new Beds24AuthError(
        `Beds24 rejected a freshly minted access token (${res.status}): ${text.slice(0, 200)}. Check the refresh token's scopes and property access.`,
      );
    }
  }

  warnOnLowCredits(res);

  if (res.status === 429 || (res.status === 400 && /credit limit|rate limit|too many requests|credits? (?:exhausted|used up)/i.test(text))) {
    throw new Beds24RateLimitError(
      `Beds24 ${method} ${path} was rate limited (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}. Credits refill every five minutes.`,
    );
  }
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

/**
 * Beds24 spells its credit headers two ways (X-FiveMinCreditLimit-Remaining in
 * the spec, x-five-min-limit-remaining in practice); read both.
 */
function warnOnLowCredits(res: Response): void {
  const raw =
    res.headers.get("x-fivemincreditlimit-remaining") ?? res.headers.get("x-five-min-limit-remaining");
  if (raw === null) return;
  const remaining = Number(raw);
  if (Number.isFinite(remaining) && remaining < LOW_CREDIT_WARNING) {
    console.warn(`[beds24] only ${remaining} API credits left in this five-minute window.`);
  }
}

export class Beds24ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Beds24ApiError";
  }
}

/**
 * Beds24 refused the booking because the room is no longer free for those
 * nights. A ReservationRejectedError, so the webhook alerts the owner and
 * stops Stripe retrying instead of failing the same way for three days.
 */
export class Beds24UnavailableError extends ReservationRejectedError {
  constructor(message: string) {
    super("unavailable", message);
    this.name = "Beds24UnavailableError";
  }
}

/** Beds24's five-minute credit allowance is used up; retry after the window. */
export class Beds24RateLimitError extends Beds24ApiError {
  constructor(message: string) {
    super(message);
    this.name = "Beds24RateLimitError";
  }
}

export class Beds24NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "Beds24NotImplementedError";
  }
}
