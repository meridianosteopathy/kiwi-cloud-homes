import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  reserveFromPaymentIntent,
  ReservationMetadataError,
} from "@/lib/booking/reservation";
import { sendBookingAlert } from "@/lib/email/booking-alert";
import { sendBookingConfirmation } from "@/lib/email/booking-confirmation";
import { getHostawayClient, ReservationRejectedError } from "@/lib/hostaway";
import { getStripe, StripeConfigError } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook receiver. Listens for `payment_intent.succeeded` and creates
 * the corresponding Hostaway reservation.
 *
 * Idempotency: process-level Set keyed by Stripe event id. Stripe retries the
 * same event on non-2xx, so we only have to defend against same-instance dupes.
 * On a multi-instance deploy this should be backed by Redis/KV; left for later.
 */

const SEEN: Set<string> = new Set();
const SEEN_MAX = 1000; // bound memory; oldest pruned in arrival order
const SEEN_FIFO: string[] = [];

/** Stripe takes/returns minor units for normal currencies, but a handful are
 *  zero-decimal (no cent subdivision). NZD/USD/AUD/etc. are 2-decimal. */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg",
  "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);
function isZeroDecimal(currency: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase());
}

/** Forget an event so a redelivery is processed again; only for answers that ask Stripe to retry. */
function forgetEvent(id: string): void {
  SEEN.delete(id);
  const idx = SEEN_FIFO.indexOf(id);
  if (idx >= 0) SEEN_FIFO.splice(idx, 1);
}

function rememberEvent(id: string): boolean {
  if (SEEN.has(id)) return false;
  SEEN.add(id);
  SEEN_FIFO.push(id);
  if (SEEN_FIFO.length > SEEN_MAX) {
    const evicted = SEEN_FIFO.shift();
    if (evicted) SEEN.delete(evicted);
  }
  return true;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[booking/webhook] STRIPE_WEBHOOK_SECRET not configured.");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe-Signature header" },
      { status: 400 },
    );
  }

  // Stripe needs the raw body for signature verification.
  const raw = await req.text();

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("[booking/webhook] signature verification failed:", err);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 },
    );
  }

  if (!rememberEvent(event.id)) {
    console.log(`[booking/webhook] ${event.id} already processed; ack.`);
    return NextResponse.json({ ok: true, deduped: true });
  }

  if (event.type !== "payment_intent.succeeded") {
    // Acknowledge other event types so Stripe stops retrying; we just don't act.
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const pi = event.data.object as Stripe.PaymentIntent;

  try {
    const reservation = await reserveFromPaymentIntent(pi);
    console.log(
      `[booking/webhook] reservation ${reservation.id} created for PaymentIntent ${pi.id}`,
    );

    // Send confirmation email. Failures here are logged but don't fail the
    // webhook — the booking is already created; we don't want Stripe to retry
    // and double-create.
    try {
      const meta = pi.metadata ?? {};
      // Confirm the home that was actually booked, not the first one. The
      // reservation carries the id the engine knows, which can differ from
      // the PaymentIntent's when the site switched engines mid-checkout.
      const listing = await getHostawayClient().getListing(reservation.listingId ?? meta.listing_id);
      const total =
        pi.currency && pi.amount_received
          ? isZeroDecimal(pi.currency)
            ? pi.amount_received
            : pi.amount_received / 100
          : 0;
      const result = await sendBookingConfirmation({
        guestName: meta.guest_name ?? "",
        guestEmail: meta.guest_email ?? "",
        locale: meta.locale === "en" ? "en" : "zh-CN",
        listing,
        checkIn: meta.check_in ?? "",
        checkOut: meta.check_out ?? "",
        nights: Number(meta.nights) || 0,
        guests: Number(meta.guests) || 0,
        total,
        currency: pi.currency?.toUpperCase() ?? "NZD",
        reservationId: reservation.id,
        paymentIntentId: pi.id,
      });
      if (result.skipped) {
        console.log(`[booking/webhook] confirmation email skipped: ${result.skipped}`);
      } else if (result.error) {
        console.error(`[booking/webhook] confirmation email failed: ${result.error}`);
      } else {
        console.log(`[booking/webhook] confirmation email sent: ${result.id}`);
      }
    } catch (emailErr) {
      console.error("[booking/webhook] confirmation email threw:", emailErr);
    }

    return NextResponse.json({ ok: true, reservationId: reservation.id });
  } catch (err) {
    // Only a 500 asks Stripe to redeliver, so only then drop the dedup entry.
    // An acked event keeps its entry; otherwise a same-instance redelivery
    // would re-run the engine call and send the owner a second alert.
    const retryLater = (body: Record<string, unknown>) => {
      forgetEvent(event.id);
      return NextResponse.json(body, { status: 500 });
    };

    if (err instanceof ReservationRejectedError) {
      // The money is captured but no booking can be written: the nights
      // went to another channel between quote and payment, the listing is
      // not one the engine knows, or the currency does not match. Retrying
      // cannot fix any of those; a person has to refund or re-home the
      // guest. Tell the owner, and only once that message is out tell
      // Stripe to stop retrying. If the alert cannot be sent, keep the 500
      // so the failure stays visible in Stripe's webhook view.
      console.error(`[booking/webhook] reservation rejected (${err.reason}):`, err.message);
      const alert = await sendBookingAlert({ reason: err.reason, detail: err.message, paymentIntent: pi });
      if (alert.id) {
        console.log(`[booking/webhook] owner alerted (${alert.id}); acking so Stripe stops retrying.`);
        return NextResponse.json(
          { ok: false, error: err.message, retriable: false, alerted: true },
          { status: 200 },
        );
      }
      console.error(
        `[booking/webhook] owner alert not sent (${alert.skipped ?? alert.error}); answering 500 so Stripe keeps retrying.`,
      );
      return retryLater({ ok: false, error: err.message, retriable: true });
    }

    if (err instanceof ReservationMetadataError) {
      console.error(
        "[booking/webhook] metadata error (not retrying):",
        err.message,
      );
      // Bad metadata won't fix itself on retry; ack so Stripe stops. A
      // payment that carries none of the website's keys is not a website
      // booking at all (another product on the same Stripe account) and
      // needs no alert. One that carries them malformed, with money
      // captured, is ours: the owner must know, and if the alert cannot be
      // sent the failure stays visible in Stripe.
      const meta = pi.metadata ?? {};
      const websitePayment = Boolean(meta.listing_id || meta.check_in || meta.guest_email);
      if (pi.amount_received > 0 && websitePayment) {
        const alert = await sendBookingAlert({ reason: "missing_metadata", detail: err.message, paymentIntent: pi });
        if (!alert.id) {
          console.error(
            `[booking/webhook] owner alert not sent (${alert.skipped ?? alert.error}); answering 500 so Stripe keeps retrying.`,
          );
          return retryLater({ ok: false, error: err.message, retriable: true });
        }
      } else if (pi.amount_received > 0) {
        console.log(`[booking/webhook] ${pi.id} carries no website booking metadata; not a site booking, acking.`);
      }
      return NextResponse.json(
        { ok: false, error: err.message, retriable: false },
        { status: 200 },
      );
    }

    console.error("[booking/webhook] reservation create failed:", err);
    return retryLater({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
}
