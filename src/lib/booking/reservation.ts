import type Stripe from "stripe";
import { getHostawayClient, type ReservationResult } from "@/lib/hostaway";

/**
 * Splits a free-form display name into first/last, since Hostaway wants both.
 * Single-name guests (common for Chinese / many cultures) get an empty last name.
 */
function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { first: full.trim(), last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * Currencies Stripe treats as zero-decimal (no cent subdivision).
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG",
  "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

function fromMinor(amount: number, currency: string): number {
  if (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase())) return amount;
  return amount / 100;
}

export class ReservationMetadataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReservationMetadataError";
  }
}

/**
 * Translates a Stripe PaymentIntent that we created in /api/booking/payment-intent
 * into a Hostaway reservation. Pulls the booking details from PaymentIntent
 * metadata so the webhook handler doesn't need to trust client-supplied data.
 */
export async function reserveFromPaymentIntent(
  pi: Stripe.PaymentIntent,
): Promise<ReservationResult> {
  const meta = pi.metadata ?? {};
  const listingId = meta.listing_id;
  const checkIn = meta.check_in;
  const checkOut = meta.check_out;
  const guestsRaw = meta.guests;
  const guestName = meta.guest_name;
  const guestEmail = meta.guest_email;

  if (
    !listingId ||
    !checkIn ||
    !checkOut ||
    !guestsRaw ||
    !guestName ||
    !guestEmail
  ) {
    throw new ReservationMetadataError(
      `PaymentIntent ${pi.id} is missing booking metadata (need listing_id, check_in, check_out, guests, guest_name, guest_email).`,
    );
  }

  const guests = Number(guestsRaw);
  if (!Number.isInteger(guests) || guests < 1) {
    throw new ReservationMetadataError(
      `PaymentIntent ${pi.id} has invalid guests metadata: ${guestsRaw}`,
    );
  }

  if (!pi.currency || pi.amount_received <= 0) {
    throw new ReservationMetadataError(
      `PaymentIntent ${pi.id} has no captured amount yet.`,
    );
  }

  const { first, last } = splitName(guestName);
  const total = fromMinor(pi.amount_received, pi.currency);

  const client = getHostawayClient();
  return client.createReservation({
    listingId,
    guestFirstName: first,
    guestLastName: last,
    guestEmail,
    arrivalDate: checkIn,
    departureDate: checkOut,
    numberOfGuests: guests,
    totalPrice: total,
    currency: pi.currency.toUpperCase(),
    externalRef: pi.id,
  });
}
