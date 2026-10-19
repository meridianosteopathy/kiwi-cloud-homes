/**
 * The "standalone" booking backend: the website runs without a booking
 * engine. Listing facts come from src/content/homes.ts, taken dates from the
 * iCal feeds each home's channel app (Hospitable, Airbnb, Booking.com)
 * publishes, and guests send an inquiry instead of paying online.
 *
 * It implements the same interface as the Hostaway and Beds24 clients, so
 * the pages do not change; only `capabilities.directBooking` is false, which
 * hides the checkout and refuses the payment route.
 */

import { HOMES, type HomeProfile } from "@/content/homes";
import { categorizeImage } from "@/lib/photos";
import type {
  AvailabilityDay,
  HostawayClient,
  HostawayListing,
  InquiryInput,
  InquiryResult,
  ReservationInput,
  ReservationResult,
} from "@/lib/hostaway/types";
import { blockedNightsFor, icalUrlsFor } from "./feeds";

const DEFAULT_CURRENCY = "NZD";
/** Guest-count dropdown size when a home's capacity has not been filled in yet. */
export const UNKNOWN_CAPACITY_GUESTS = 8;

const NZ_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Pacific/Auckland",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** The homes the site lists: every profile that has been given a display name. */
export function standaloneHomes(): HomeProfile[] {
  return HOMES.filter((h) => typeof h.name === "string" && h.name.trim().length > 0);
}

export function createStandaloneClient(): HostawayClient {
  const homes = standaloneHomes();
  if (homes.length === 0) {
    console.warn(
      "[standalone] no home in src/content/homes.ts has a `name`; the site will list nothing until one does.",
    );
  }
  const liveAvailability = homes.some((h) => icalUrlsFor(h.key).length > 0);

  function find(listingId: string): HomeProfile | undefined {
    const id = normalize(listingId);
    return homes.find((h) => normalize(h.key) === id);
  }

  return {
    capabilities: { directBooking: false, liveAvailability },

    async listListings() {
      return homes.map(toListing);
    },

    async getListing(listingId?: string) {
      const home = listingId ? find(listingId) : homes[0];
      if (!home) {
        throw new StandaloneError(
          listingId ? `"${listingId}" is not one of the homes in src/content/homes.ts.` : "No homes are configured.",
        );
      }
      return toListing(home);
    },

    async isConfiguredListing(listingId) {
      return Boolean(find(listingId));
    },

    async getAvailability(listingId, start, end) {
      const home = find(listingId);
      if (!home) throw new StandaloneError(`"${listingId}" is not one of the homes in src/content/homes.ts.`);
      const { nights, feeds, failed } = await blockedNightsFor(home.key, start, end);
      if (failed > 0) {
        // Better to say "couldn't load" than to show taken nights as free:
        // the availability route answers 502, the date picker shows its
        // fallback notice, and the inquiry still goes through.
        throw new StandaloneError(
          `${failed} of ${feeds} calendar feed(s) for "${home.key}" could not be read and no recent copy exists.`,
        );
      }
      const today = NZ_DATE.format(new Date());
      const price = { amount: home.fromPrice ?? 0, currency: home.currency ?? DEFAULT_CURRENCY };
      const ownerBlocked = ownerBlockedNights(home, start, end);
      return dateRange(start, end).map<AvailabilityDay>((date) => ({
        date,
        available: date >= today && !nights.has(date) && !ownerBlocked.has(date),
        price,
        minimumStay: home.minNights && home.minNights > 0 ? home.minNights : undefined,
      }));
    },

    async createInquiry(_input: InquiryInput): Promise<InquiryResult> {
      throw new StandaloneError(
        "Inquiries are delivered by email (see /api/booking/inquiry); there is no booking engine inbox.",
      );
    },

    async createReservation(_input: ReservationInput): Promise<ReservationResult> {
      throw new StandaloneError(
        "Direct booking is turned off: the standalone backend has no calendar to write a reservation to.",
      );
    },
  };
}

/** A home profile as the pages expect a listing. */
export function toListing(home: HomeProfile): HostawayListing {
  const currency = home.currency ?? DEFAULT_CURRENCY;
  return {
    id: home.key,
    name: home.name?.trim() || home.key,
    // Localised copy is applied by the card via resolveDescription; this is the fallback.
    description: home.description?.en?.trim() || home.description?.["zh-CN"]?.trim() || "",
    bedrooms: home.bedrooms ?? 0,
    bathrooms: home.bathrooms ?? 0,
    maxGuests: home.maxGuests ?? 0,
    basePrice: { amount: home.fromPrice ?? 0, currency },
    cleaningFee: home.cleaningFee ?? 0,
    minNights: Math.max(1, home.minNights ?? 1),
    maxNights: home.maxNights && home.maxNights > 0 ? home.maxNights : 0,
    images: (home.images ?? [])
      .filter((i) => i.url)
      .map((i) => ({ url: i.url, caption: i.caption ?? "", category: categorizeImage(i.caption) })),
    amenities: (home.amenities ?? []).map((name) => ({ id: slug(name), name })),
    address: {
      line1: home.address?.line1?.trim() || "—",
      city: home.address?.city ?? "",
      region: home.address?.region ?? "",
      country: home.address?.country ?? "New Zealand",
    },
    tourUrl: home.tourUrl && home.tourUrl.trim() ? home.tourUrl : undefined,
  };
}

/** Nights the owner listed under `blockedDates` (first and last night inclusive). */
export function ownerBlockedNights(home: Pick<HomeProfile, "key" | "blockedDates">, start: string, end: string): Set<string> {
  const out = new Set<string>();
  for (const block of home.blockedDates ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(block.from) || !/^\d{4}-\d{2}-\d{2}$/.test(block.to) || block.to < block.from) {
      console.warn(`[standalone] ignoring malformed blockedDates entry on "${home.key}": ${JSON.stringify(block)}`);
      continue;
    }
    for (const date of dateRange(block.from < start ? start : block.from, block.to > end ? end : block.to)) {
      out.add(date);
    }
  }
  return out;
}

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "amenity";
}

function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return out;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
    if (out.length > 1000) break;
  }
  return out;
}

export class StandaloneError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StandaloneError";
  }
}
