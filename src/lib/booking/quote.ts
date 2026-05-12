import { getHostawayClient, type HostawayListing } from "@/lib/hostaway";

export interface QuoteInput {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guests: number;
}

export interface QuoteBreakdownLine {
  label: "nightly" | "cleaning";
  /** Amount in the listing's currency (major units, e.g. NZD). */
  amount: number;
  meta?: { nights?: number; nightly?: number };
}

export interface Quote {
  listingId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  currency: string;
  /** Currency display (major units), e.g. 420. */
  total: number;
  /** Stripe-friendly amount (minor units, e.g. cents). */
  totalMinor: number;
  breakdown: QuoteBreakdownLine[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class QuoteError extends Error {
  constructor(
    public code:
      | "invalid_dates"
      | "checkout_before_checkin"
      | "guests_invalid"
      | "guests_over_capacity"
      | "unavailable",
    message: string,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

export async function computeQuote(input: QuoteInput): Promise<Quote> {
  validate(input);

  const client = getHostawayClient();
  const listing = await client.getListing();

  if (input.guests > listing.maxGuests) {
    throw new QuoteError(
      "guests_over_capacity",
      `This home sleeps up to ${listing.maxGuests} guests.`,
    );
  }

  const calendar = await client.getAvailability(input.checkIn, input.checkOut);
  // The Hostaway calendar endpoint typically returns dates inclusive of
  // checkIn and checkOut; we only need the booked nights (checkIn..checkOut-1).
  const bookedNights = calendar.filter((day) => day.date < input.checkOut);

  const unavailable = bookedNights.find((day) => !day.available);
  if (unavailable) {
    throw new QuoteError(
      "unavailable",
      `The home isn't available on ${unavailable.date}.`,
    );
  }

  const nights = bookedNights.length;
  if (nights <= 0) {
    throw new QuoteError("checkout_before_checkin", "Pick a check-out after check-in.");
  }

  const currency = listing.basePrice.currency;
  const nightlyTotal = bookedNights.reduce((sum, day) => sum + day.price.amount, 0);
  const cleaning = listing.cleaningFee;

  const breakdown: QuoteBreakdownLine[] = [
    {
      label: "nightly",
      amount: nightlyTotal,
      meta: { nights, nightly: listing.basePrice.amount },
    },
  ];
  if (cleaning > 0) {
    breakdown.push({ label: "cleaning", amount: cleaning });
  }

  const total = round2(nightlyTotal + cleaning);
  return {
    listingId: listing.id,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    nights,
    guests: input.guests,
    currency,
    total,
    totalMinor: toMinor(total, currency),
    breakdown,
  };
}

function validate(input: QuoteInput): void {
  if (!DATE.test(input.checkIn) || !DATE.test(input.checkOut)) {
    throw new QuoteError("invalid_dates", "Dates must be ISO YYYY-MM-DD.");
  }
  if (input.checkOut <= input.checkIn) {
    throw new QuoteError("checkout_before_checkin", "Check-out must be after check-in.");
  }
  if (!Number.isInteger(input.guests) || input.guests < 1) {
    throw new QuoteError("guests_invalid", "Guests must be a positive integer.");
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Stripe takes minor units (cents for most currencies). Zero-decimal currencies
 * (JPY, KRW, etc.) take whole units. Most rental sites use NZD/USD/AUD/GBP which
 * are 2-decimal; we default to that.
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

function toMinor(major: number, currency: string): number {
  const upper = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(upper)) {
    return Math.round(major);
  }
  return Math.round(major * 100);
}

export function listingExposes(listing: HostawayListing): boolean {
  return Boolean(listing.id);
}
