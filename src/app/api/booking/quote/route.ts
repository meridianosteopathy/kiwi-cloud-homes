import { NextResponse } from "next/server";
import { computeQuote, QuoteError } from "@/lib/booking/quote";

export const dynamic = "force-dynamic";

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

  try {
    const quote = await computeQuote(parsed);
    return NextResponse.json(quote);
  } catch (err) {
    if (err instanceof QuoteError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: statusForQuoteError(err) },
      );
    }
    console.error("[booking/quote] unexpected error:", err);
    return NextResponse.json(
      { error: "Unable to price this stay right now. Please try again." },
      { status: 502 },
    );
  }
}

function statusForQuoteError(err: QuoteError): number {
  if (err.code === "unavailable") return 409;
  if (err.code === "unknown_listing") return 404;
  return 400;
}

function parseBody(
  body: unknown,
):
  | { listingId: string; checkIn: string; checkOut: string; guests: number }
  | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "Expected an object." };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.listingId !== "string" || !b.listingId.trim()) {
    return { error: "listingId is required." };
  }
  if (typeof b.checkIn !== "string" || typeof b.checkOut !== "string") {
    return { error: "checkIn and checkOut are required strings." };
  }
  const guests = typeof b.guests === "number" ? b.guests : Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1) {
    return { error: "guests must be a positive integer." };
  }
  return {
    listingId: b.listingId.trim(),
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    guests,
  };
}
