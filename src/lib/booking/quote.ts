import { getHostawayClient, type AvailabilityDay, type HostawayListing } from "@/lib/hostaway";

export interface QuoteInput {
  /** Hostaway listing id — which of the homes is being priced. */
  listingId: string;
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
  /** Display name of the home being priced — shown in the checkout dialog. */
  listingName: string;
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
      | "below_min_nights"
      | "above_max_nights"
      | "unavailable"
      | "unknown_listing",
    message: string,
  ) {
    super(message);
    this.name = "QuoteError";
  }
}

export async function computeQuote(input: QuoteInput): Promise<Quote> {
  validate(input);

  const client = getHostawayClient();
  // The listing id comes from the browser, so check it against the configured
  // set before pricing it — otherwise any listing on the Hostaway account
  // could be quoted and booked through this site.
  if (!(await client.isConfiguredListing(input.listingId))) {
    throw new QuoteError(
      "unknown_listing",
      "That home isn't available for booking on this site.",
    );
  }
  const listing = await client.getListing(input.listingId);

  if (input.guests > listing.maxGuests) {
    throw new QuoteError(
      "guests_over_capacity",
      `This home sleeps up to ${listing.maxGuests} guests.`,
    );
  }

  const calendar = await client.getAvailability(
    listing.id,
    input.checkIn,
    input.checkOut,
  );
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

  // The host can close a day for arrivals or departures without closing it
  // for stays that pass through (Beds24 noCheckIn / noCheckOut overrides).
  const restriction = arrivalDepartureRestriction(calendar, input.checkIn, input.checkOut);
  if (restriction) {
    throw new QuoteError("unavailable", restriction);
  }

  // Minimum stay can be set per date in the engine's calendar as well as per
  // listing; the engine does not enforce it on a booking written through the
  // API, so this quote is the only gate.
  const minNights = effectiveMinNights(listing.minNights, bookedNights);
  if (nights < minNights) {
    throw new QuoteError(
      "below_min_nights",
      `Minimum stay for these dates is ${minNights} night${minNights === 1 ? "" : "s"}.`,
    );
  }
  if (listing.maxNights > 0 && nights > listing.maxNights) {
    throw new QuoteError(
      "above_max_nights",
      `Maximum stay for this home is ${listing.maxNights} night${listing.maxNights === 1 ? "" : "s"}.`,
    );
  }

  const currency = listing.basePrice.currency;
  const nightlyTotal = bookedNights.reduce((sum, day) => sum + day.price.amount, 0);
  const cleaning = listing.cleaningFee;
  // Use the average actual rate so the "X × N nights" breakdown line
  // multiplies out correctly. Hostaway often returns per-day prices that
  // diverge from listing.basePrice (seasonal pricing, weekday discounts),
  // so the listing-level base price is the wrong number to show here.
  const avgNightly = round2(nightlyTotal / nights);

  const breakdown: QuoteBreakdownLine[] = [
    {
      label: "nightly",
      amount: nightlyTotal,
      meta: { nights, nightly: avgNightly },
    },
  ];
  if (cleaning > 0) {
    breakdown.push({ label: "cleaning", amount: cleaning });
  }

  const total = round2(nightlyTotal + cleaning);
  return {
    listingId: listing.id,
    listingName: listing.name,
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
  if (!input.listingId || !input.listingId.trim()) {
    throw new QuoteError("unknown_listing", "No home was selected.");
  }
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

/**
 * The minimum stay that applies to a set of booked nights. Beds24 returns the
 * effective per-day rule for every night (the room default where the
 * calendar has none), so when every night carries a value the calendar is
 * authoritative: a calendar that relaxes the room's minimum is honoured, and
 * a longer calendar minimum on any night of the stay applies (stay-through).
 * When some nights carry no value the listing default still applies.
 */
export function effectiveMinNights(
  listingMinNights: number,
  bookedNights: Array<Pick<AvailabilityDay, "minimumStay">>,
): number {
  const perDay = bookedNights
    .map((d) => (typeof d.minimumStay === "number" ? d.minimumStay : 0))
    .filter((n) => n > 0);
  if (perDay.length === 0) return Math.max(1, listingMinNights);
  const calendarMax = Math.max(...perDay);
  return perDay.length === bookedNights.length
    ? Math.max(1, calendarMax)
    : Math.max(1, listingMinNights, calendarMax);
}

/**
 * Why a stay may not start or end on the requested days, or null when it may.
 * `calendar` is the engine's inclusive check-in..check-out range.
 */
export function arrivalDepartureRestriction(
  calendar: Array<Pick<AvailabilityDay, "date" | "noCheckIn" | "noCheckOut">>,
  checkIn: string,
  checkOut: string,
): string | null {
  const arrival = calendar.find((d) => d.date === checkIn);
  if (arrival?.noCheckIn) {
    return `Check-in isn't possible on ${checkIn} for this home; pick another arrival day.`;
  }
  const departure = calendar.find((d) => d.date === checkOut);
  if (departure?.noCheckOut) {
    return `Check-out isn't possible on ${checkOut} for this home; pick another departure day.`;
  }
  return null;
}
