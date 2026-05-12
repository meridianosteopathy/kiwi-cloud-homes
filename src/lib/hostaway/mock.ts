import type {
  AvailabilityDay,
  HostawayClient,
  HostawayListing,
  InquiryInput,
  InquiryResult,
} from "./types";

const MOCK_LISTING: HostawayListing = {
  id: "mock-1",
  name: "Auckland Garden Retreat",
  description:
    "A bright four-bedroom family home in Epsom, Auckland — in zone for Auckland Grammar and Epsom Girls Grammar, walking distance to parks, an easy drive to the CBD. Designed for longer stays: full kitchen, study nook, fast Wi-Fi.",
  bedrooms: 4,
  bathrooms: 2,
  maxGuests: 8,
  basePrice: { amount: 420, currency: "NZD" },
  images: [],
  address: {
    line1: "—",
    city: "Epsom, Auckland",
    region: "Auckland",
    country: "New Zealand",
  },
};

function dateRange(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + "T00:00:00Z");
  const end = new Date(endISO + "T00:00:00Z");
  for (
    let d = new Date(start);
    d <= end;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

export function createMockClient(): HostawayClient {
  return {
    async getListing() {
      return MOCK_LISTING;
    },

    async getAvailability(start, end) {
      return dateRange(start, end).map<AvailabilityDay>((date) => {
        // Weekends a touch pricier; deterministic so SSR is stable.
        const dow = new Date(date + "T00:00:00Z").getUTCDay();
        const weekend = dow === 0 || dow === 6;
        return {
          date,
          available: true,
          price: {
            amount: weekend ? 480 : 420,
            currency: "NZD",
          },
        };
      });
    },

    async createInquiry(input: InquiryInput): Promise<InquiryResult> {
      return {
        id: `mock-inquiry-${Date.now()}`,
        receivedAt: new Date().toISOString(),
      };
    },
  };
}
