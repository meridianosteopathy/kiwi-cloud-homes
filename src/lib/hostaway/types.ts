/**
 * ISO 4217 currency code returned by Hostaway (e.g. "NZD"). Kept open since
 * Intl.NumberFormat accepts any valid code and Hostaway accounts can be
 * configured to any currency.
 */
export type Currency = string;

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
  /** Flat cleaning fee charged per booking, in the listing's currency. */
  cleaningFee: number;
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
