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

export interface Amenity {
  /** Hostaway amenityId (numeric in their API). */
  id: string;
  /** Display name as returned by Hostaway, typically English. */
  name: string;
}

import type { ImageCategory } from "@/lib/photos";

export interface ListingImage {
  url: string;
  /** Hostaway-supplied caption (English). May be empty. */
  caption?: string;
  /** Derived from the caption — used to group photos in the lightbox. */
  category: ImageCategory;
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
  /** Minimum nights per booking (Hostaway `minNights`). 1 if not set. */
  minNights: number;
  /** Maximum nights per booking (Hostaway `maxNights`). 0 / Infinity if not set. */
  maxNights: number;
  images: ListingImage[];
  amenities: Amenity[];
  address: HostawayAddress;
  /** Optional 360° tour URL (Matterport, Kuula, etc.). */
  tourUrl?: string;
}

export interface AvailabilityDay {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  available: boolean;
  price: HostawayPrice;
  /** Per-day minimum stay rule (Hostaway `minimumStay`); 0/undefined = use listing default. */
  minimumStay?: number;
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

export interface ReservationInput {
  /** Hostaway listing/listingMap id. */
  listingId: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone?: string;
  /** YYYY-MM-DD. */
  arrivalDate: string;
  /** YYYY-MM-DD. */
  departureDate: string;
  numberOfGuests: number;
  totalPrice: number;
  currency: Currency;
  /** Stripe payment intent id — sent as channelReservationId for traceability. */
  externalRef: string;
}

export interface ReservationResult {
  /** Hostaway reservation id (numeric in Hostaway, kept as string for safety). */
  id: string;
  /** Whether Hostaway recognised this externalRef and returned an existing
   *  reservation rather than creating a new one. */
  alreadyExisted?: boolean;
}

export interface HostawayClient {
  getListing(): Promise<HostawayListing>;
  getAvailability(start: string, end: string): Promise<AvailabilityDay[]>;
  createInquiry(input: InquiryInput): Promise<InquiryResult>;
  createReservation(input: ReservationInput): Promise<ReservationResult>;
}
