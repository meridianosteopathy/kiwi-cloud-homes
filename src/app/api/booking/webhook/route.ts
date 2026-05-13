import { NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  reserveFromPaymentIntent,
  ReservationMetadataError,
} from "@/lib/booking/reservation";
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
    return NextResponse.json({ ok: true, reservationId: reservation.id });
  } catch (err) {
    // Drop the dedup entry so a retry can re-attempt; Stripe will redeliver.
    SEEN.delete(event.id);
    const idx = SEEN_FIFO.indexOf(event.id);
    if (idx >= 0) SEEN_FIFO.splice(idx, 1);

    if (err instanceof ReservationMetadataError) {
      console.error(
        "[booking/webhook] metadata error (not retrying):",
        err.message,
      );
      // Bad metadata won't fix itself on retry; ack so Stripe stops.
      return NextResponse.json(
        { ok: false, error: err.message, retriable: false },
        { status: 200 },
      );
    }

    console.error("[booking/webhook] reservation create failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
