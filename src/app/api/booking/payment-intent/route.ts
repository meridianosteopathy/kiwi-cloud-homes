import { NextResponse } from "next/server";
import { computeQuote, QuoteError } from "@/lib/booking/quote";
import { getStripe, StripeConfigError } from "@/lib/stripe/server";

export const dynamic = "force-dynamic";

/**
 * Creates a Stripe PaymentIntent for the booking. Recomputes the quote
 * server-side from {checkIn, checkOut, guests} — never trusts client-supplied
 * totals.
 *
 * Until PR C ships the Hostaway reservation creation + webhook, payment is
 * captured but no booking is recorded against the calendar. We pass enough
 * metadata that a future webhook handler can pick it up and create the
 * reservation idempotently.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  let quote;
  try {
    quote = await computeQuote(parsed);
  } catch (err) {
    if (err instanceof QuoteError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.code === "unavailable" ? 409 : 400 },
      );
    }
    console.error("[booking/payment-intent] quote error:", err);
    return NextResponse.json({ error: "Quote unavailable" }, { status: 502 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    if (err instanceof StripeConfigError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    throw err;
  }

  try {
    const intent = await stripe.paymentIntents.create({
      amount: quote.totalMinor,
      currency: quote.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      receipt_email: parsed.guestEmail,
      description: `Kiwi Cloud Homes — ${quote.nights} night${quote.nights === 1 ? "" : "s"} (${quote.checkIn} → ${quote.checkOut})`,
      metadata: {
        listing_id: quote.listingId,
        check_in: quote.checkIn,
        check_out: quote.checkOut,
        nights: String(quote.nights),
        guests: String(quote.guests),
        guest_name: parsed.guestName,
        guest_email: parsed.guestEmail,
        locale: parsed.locale,
      },
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      quote,
    });
  } catch (err) {
    console.error("[booking/payment-intent] Stripe error:", err);
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : "Could not create payment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function parseBody(
  body: unknown,
):
  | {
      checkIn: string;
      checkOut: string;
      guests: number;
      guestName: string;
      guestEmail: string;
      locale: "zh-CN" | "en";
    }
  | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Expected an object." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.checkIn !== "string" || typeof b.checkOut !== "string") {
    return { error: "checkIn and checkOut are required strings." };
  }
  const guests = typeof b.guests === "number" ? b.guests : Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1) {
    return { error: "guests must be a positive integer." };
  }
  if (typeof b.guestName !== "string" || !b.guestName.trim()) {
    return { error: "guestName is required." };
  }
  if (typeof b.guestEmail !== "string" || !b.guestEmail.trim()) {
    return { error: "guestEmail is required." };
  }
  const locale: "zh-CN" | "en" = b.locale === "en" ? "en" : "zh-CN";
  return {
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests,
    guestName: b.guestName.trim(),
    guestEmail: b.guestEmail.trim(),
    locale,
  };
}
