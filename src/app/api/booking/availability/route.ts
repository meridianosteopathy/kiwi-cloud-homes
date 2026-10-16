import { NextResponse } from "next/server";
import { getHostawayClient } from "@/lib/hostaway";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 400; // ~13 months — bounds Hostaway calls

/**
 * GET /api/booking/availability?listingId=123&start=YYYY-MM-DD&end=YYYY-MM-DD
 *
 * Returns `{ unavailable, noCheckIn, noCheckOut }`: ISO dates the host has
 * marked unavailable for that home, plus days a stay may not start or end on.
 * The date picker uses this to grey days out and steer the selection before
 * the guest even tries to quote; the quote remains the real gate.
 *
 * Cached for 5 minutes server-side so a clicked-around picker doesn't hit
 * Hostaway on every modal open. Calendars don't move minute-to-minute.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId")?.trim();
  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");

  if (!listingId) {
    return NextResponse.json(
      { error: "listingId query param is required" },
      { status: 400 },
    );
  }

  if (!start || !end || !DATE.test(start) || !DATE.test(end)) {
    return NextResponse.json(
      { error: "start and end query params must be YYYY-MM-DD" },
      { status: 400 },
    );
  }

  if (end <= start) {
    return NextResponse.json(
      { error: "end must be after start" },
      { status: 400 },
    );
  }

  const days = Math.round(
    (new Date(end + "T00:00:00Z").getTime() -
      new Date(start + "T00:00:00Z").getTime()) /
      86_400_000,
  );
  if (days > MAX_DAYS) {
    return NextResponse.json(
      { error: `range too large; max ${MAX_DAYS} days` },
      { status: 400 },
    );
  }

  const client = getHostawayClient();

  try {
    // The id is client-supplied; only serve calendars for homes this site
    // actually lists.
    if (!(await client.isConfiguredListing(listingId))) {
      return NextResponse.json({ error: "Unknown listing" }, { status: 404 });
    }

    const cal = await client.getAvailability(listingId, start, end);
    const unavailable = cal.filter((d) => !d.available).map((d) => d.date);
    const noCheckIn = cal.filter((d) => d.available && d.noCheckIn).map((d) => d.date);
    const noCheckOut = cal.filter((d) => d.noCheckOut).map((d) => d.date);
    return NextResponse.json(
      { unavailable, noCheckIn, noCheckOut },
      {
        headers: {
          // Browser + CDN cache for 5 minutes; stale-while-revalidate
          // serves the previous response while we fetch a fresh one in the
          // background.
          "Cache-Control":
            "public, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (err) {
    console.error("[booking/availability] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Availability unavailable" },
      { status: 502 },
    );
  }
}
