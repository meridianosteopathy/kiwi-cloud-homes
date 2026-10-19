import type Stripe from "stripe";
import { homeProfileFor } from "@/content/homes";
import {
  getHostawayClient,
  ReservationRejectedError,
  type HostawayClient,
  type ReservationResult,
} from "@/lib/hostaway";

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
  // The site lists several homes, so listing_id decides which calendar this
  // reservation lands on. Re-check it here: metadata is written by us, but a
  // PaymentIntent created before an engine switch carries the old engine's
  // id, and a stale one could name a listing since removed from the site.
  const resolvedListingId = await resolveListingId(client, listingId, pi.id);
  const result = await client.createReservation({
    listingId: resolvedListingId,
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
  return { ...result, listingId: resolvedListingId };
}

/**
 * The configured listing this PaymentIntent belongs to. Normally the
 * metadata id itself. When it is not one the current engine knows (the site
 * switched from Hostaway to Beds24 while this checkout was open), fall back
 * to the home profile in src/content/homes.ts, whose `match` list carries
 * both engines' ids, and use the id the current engine does know.
 *
 * Throws ReservationRejectedError, not ReservationMetadataError: the guest
 * has paid, and the webhook must alert the owner rather than silently ack.
 */
async function resolveListingId(
  client: HostawayClient,
  listingId: string,
  paymentIntentId: string,
): Promise<string> {
  if (await client.isConfiguredListing(listingId)) return listingId;
  const profile = homeProfileFor({ id: listingId, name: "" });
  for (const candidate of profile?.match ?? []) {
    if (candidate === listingId) continue;
    if (await client.isConfiguredListing(candidate)) {
      console.warn(
        `[booking] PaymentIntent ${paymentIntentId} names listing ${listingId}; booking it as ${candidate} (same home, current engine).`,
      );
      return candidate;
    }
  }
  throw new ReservationRejectedError(
    "unknown_listing",
    `PaymentIntent ${paymentIntentId} names listing ${listingId}, which the current booking engine doesn't list` +
      (profile ? ` (home "${profile.key}" has no id the engine knows; add it to its match list in src/content/homes.ts)` : "") +
      ".",
  );
}
