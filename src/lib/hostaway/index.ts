import { createLiveClient } from "./live";
import { createMockClient } from "./mock";
import type { HostawayClient } from "./types";

export type { HostawayClient } from "./types";
export type {
  Amenity,
  AvailabilityDay,
  Currency,
  HostawayAddress,
  HostawayListing,
  HostawayPrice,
  InquiryInput,
  InquiryResult,
  ReservationInput,
  ReservationResult,
} from "./types";

let cached: HostawayClient | null = null;

export function getHostawayClient(): HostawayClient {
  if (cached) return cached;
  cached = (process.env.HOSTAWAY_USE_MOCK ?? "true") === "false"
    ? createLiveClient()
    : createMockClient();
  return cached;
}
