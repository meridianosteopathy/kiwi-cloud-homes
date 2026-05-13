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
  id: "mock-1",
  name: "Halswell Garden Retreat",
  description:
    "A bright four-bedroom family home in Halswell, southwest Christchurch — in zone for Cashmere High and Halswell School, with easy access to Riccarton, the CBD, and Lincoln. Designed for longer stays: full kitchen, study nook, fast Wi-Fi.",
  bedrooms: 4,
  bathrooms: 2,
  maxGuests: 8,
  basePrice: { amount: 420, currency: "NZD" },
  cleaningFee: 120,
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

    async createReservation(input: ReservationInput): Promise<ReservationResult> {
      console.log("[hostaway/mock] createReservation:", input);
      return {
        id: `mock-res-${input.externalRef}`,
        alreadyExisted: false,
      };
    },
  };
}
