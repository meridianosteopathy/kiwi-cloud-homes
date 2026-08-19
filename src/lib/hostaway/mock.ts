import type {
  AvailabilityDay,
  HostawayClient,
  HostawayListing,
  InquiryInput,
  InquiryResult,
  ReservationInput,
  ReservationResult,
} from "./types";

const MOCK_LISTING: HostawayListing = {
  id: "mock-halswell",
  name: "Halswell Garden Retreat",
  description:
    "A bright four-bedroom family home in Halswell, southwest Christchurch — in zone for Cashmere High and Halswell School, with easy access to Riccarton, the CBD, and Lincoln. Designed for longer stays: full kitchen, study nook, fast Wi-Fi.",
  bedrooms: 4,
  bathrooms: 2,
  maxGuests: 8,
  basePrice: { amount: 420, currency: "NZD" },
  cleaningFee: 120,
  minNights: 2,
  maxNights: 90,
  images: [],
  amenities: [
    { id: "wifi", name: "Wifi" },
    { id: "kitchen", name: "Kitchen" },
    { id: "washer", name: "Washer" },
    { id: "dryer", name: "Dryer" },
    { id: "heating", name: "Heating" },
    { id: "free-parking", name: "Free parking on premises" },
    { id: "workspace", name: "Dedicated workspace" },
    { id: "tv", name: "TV" },
    { id: "dishwasher", name: "Dishwasher" },
    { id: "microwave", name: "Microwave" },
    { id: "iron", name: "Iron" },
    { id: "hair-dryer", name: "Hair dryer" },
    { id: "bbq", name: "BBQ grill" },
    { id: "smoke-alarm", name: "Smoke alarm" },
  ],
  address: {
    // Exact address kept internal — short-stay sites typically reveal it after booking.
    line1: "16 Sunbeam Place",
    city: "Halswell, Christchurch",
    region: "Canterbury",
    country: "New Zealand",
  },
};

/**
 * Second mock home. Stands in for the real second Hostaway listing so the
 * multi-home layout, the per-home school distances, and the per-listing
 * booking flow can all be exercised with HOSTAWAY_USE_MOCK=true.
 */
const MOCK_LISTING_2: HostawayListing = {
  id: "mock-riccarton",
  name: "Riccarton Cloud Apartment",
  description:
    "A three-bedroom home in Riccarton, walking distance to Westfield Riccarton and a short drive to the University of Canterbury and Christchurch Boys' High. Suits school-visit families who want to be close to the city.",
  bedrooms: 3,
  bathrooms: 1,
  maxGuests: 6,
  basePrice: { amount: 340, currency: "NZD" },
  cleaningFee: 100,
  minNights: 2,
  maxNights: 60,
  images: [],
  amenities: [
    { id: "wifi", name: "Wifi" },
    { id: "kitchen", name: "Kitchen" },
    { id: "washer", name: "Washer" },
    { id: "heating", name: "Heating" },
    { id: "free-parking", name: "Free parking on premises" },
    { id: "workspace", name: "Dedicated workspace" },
    { id: "tv", name: "TV" },
    { id: "dishwasher", name: "Dishwasher" },
    { id: "smoke-alarm", name: "Smoke alarm" },
  ],
  address: {
    line1: "42 Clyde Road",
    city: "Riccarton, Christchurch",
    region: "Canterbury",
    country: "New Zealand",
  },
};

const MOCK_LISTINGS: HostawayListing[] = [MOCK_LISTING, MOCK_LISTING_2];

function findMock(listingId: string): HostawayListing | undefined {
  return MOCK_LISTINGS.find((l) => l.id === listingId);
}

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
    async listListings() {
      return MOCK_LISTINGS;
    },

    async getListing(listingId?: string) {
      if (!listingId) return MOCK_LISTING;
      const listing = findMock(listingId);
      if (!listing) {
        throw new Error(`[hostaway/mock] unknown listing id: ${listingId}`);
      }
      return listing;
    },

    async isConfiguredListing(listingId) {
      return Boolean(findMock(listingId));
    },

    async getAvailability(listingId, start, end) {
      const listing = findMock(listingId) ?? MOCK_LISTING;
      return dateRange(start, end).map<AvailabilityDay>((date) => {
        // Weekends a touch pricier; deterministic so SSR is stable.
        const dow = new Date(date + "T00:00:00Z").getUTCDay();
        const weekend = dow === 0 || dow === 6;
        const base = listing.basePrice.amount;
        return {
          date,
          available: true,
          price: {
            amount: weekend ? Math.round(base * 1.15) : base,
            currency: listing.basePrice.currency,
          },
          minimumStay: listing.minNights,
        };
      });
    },

    async createInquiry(input: InquiryInput): Promise<InquiryResult> {
      return {
        id: `mock-inquiry-${Date.now()}`,
        receivedAt: new Date().toISOString(),
      };
    },

    async createReservation(input: ReservationInput): Promise<ReservationResult> {
      console.log("[hostaway/mock] createReservation:", input);
      return {
        id: `mock-res-${input.externalRef}`,
        alreadyExisted: false,
      };
    },
  };
}
