import { createMockClient } from "./mock";
import type { HostawayClient } from "./types";

export type { HostawayClient } from "./types";
export type {
  AvailabilityDay,
  Currency,
  HostawayAddress,
  HostawayListing,
  HostawayPrice,
  InquiryInput,
  InquiryResult,
} from "./types";

let cached: HostawayClient | null = null;

export function getHostawayClient(): HostawayClient {
  if (cached) return cached;

  const useMock = (process.env.HOSTAWAY_USE_MOCK ?? "true") !== "false";
  if (useMock) {
    cached = createMockClient();
    return cached;
  }

  // Real client wiring lives in a follow-up branch — see .env.example.
  throw new Error(
    "Hostaway live client is not implemented yet. Set HOSTAWAY_USE_MOCK=true or implement createLiveClient().",
  );
}
