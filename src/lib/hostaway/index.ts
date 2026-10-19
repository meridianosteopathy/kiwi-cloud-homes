import { createBeds24Client } from "@/lib/beds24";
import { createStandaloneClient } from "@/lib/standalone";
import { createLiveClient } from "./live";
import { createMockClient } from "./mock";
import type { HostawayClient } from "./types";

export type { HostawayClient } from "./types";
export type {
  Amenity,
  AvailabilityDay,
  BookingCapabilities,
  Currency,
  HostawayAddress,
  HostawayListing,
  HostawayPrice,
  InquiryInput,
  InquiryResult,
  ListingImage,
  ReservationInput,
  ReservationResult,
} from "./types";

export { ReservationRejectedError } from "./errors";
export type { ReservationRejectionReason } from "./errors";

export type BookingBackend = "mock" | "hostaway" | "beds24" | "standalone";

/**
 * Which booking engine the site talks to.
 *
 *   BOOKING_BACKEND=standalone  no engine: homes.ts for the facts, iCal feeds
 *                               for taken dates, inquiries by email, no checkout
 *   BOOKING_BACKEND=beds24      Beds24 (see src/lib/beds24, DEPLOY.md)
 *   BOOKING_BACKEND=hostaway    Hostaway's API
 *   BOOKING_BACKEND=mock        built-in fake data for local work and previews
 *
 * When BOOKING_BACKEND is unset the older switch still applies:
 * HOSTAWAY_USE_MOCK=false means Hostaway, anything else means mock.
 */
export function resolveBookingBackend(): BookingBackend {
  const explicit = (process.env.BOOKING_BACKEND ?? "").trim().toLowerCase();
  if (explicit === "beds24" || explicit === "hostaway" || explicit === "mock" || explicit === "standalone") {
    return explicit;
  }
  if (explicit) {
    console.warn(
      `[booking] unknown BOOKING_BACKEND="${explicit}"; expected standalone, beds24, hostaway or mock. Falling back to HOSTAWAY_USE_MOCK.`,
    );
  }
  return (process.env.HOSTAWAY_USE_MOCK ?? "true") === "false" ? "hostaway" : "mock";
}

let cached: HostawayClient | null = null;

/**
 * The site's booking engine. The name is historical: every page and route is
 * written against the HostawayClient interface, and each backend implements it.
 */
export function getHostawayClient(): HostawayClient {
  if (cached) return cached;
  const backend = resolveBookingBackend();
  console.log(`[booking] backend: ${backend}`);
  cached =
    backend === "standalone"
      ? createStandaloneClient()
      : backend === "beds24"
        ? createBeds24Client()
        : backend === "hostaway"
          ? createLiveClient()
          : createMockClient();
  return cached;
}
