export type Currency = "NZD" | "USD" | "CNY";

export interface HostawayPrice {
  amount: number;
  currency: Currency;
}

export interface HostawayAddress {
  line1: string;
  city: string;
  region: string;
  country: string;
}

export interface HostawayListing {
  id: string;
  name: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  basePrice: HostawayPrice;
  images: string[];
  address: HostawayAddress;
  /** Optional 360° tour URL (Matterport, Kuula, etc.). */
  tourUrl?: string;
}

export interface AvailabilityDay {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  available: boolean;
  price: HostawayPrice;
}

export interface InquiryInput {
  name: string;
  email: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message: string;
  locale: string;
}

export interface InquiryResult {
  id: string;
  receivedAt: string;
}

export interface HostawayClient {
  getListing(): Promise<HostawayListing>;
  getAvailability(start: string, end: string): Promise<AvailabilityDay[]>;
  createInquiry(input: InquiryInput): Promise<InquiryResult>;
}
