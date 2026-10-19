import { NextResponse } from "next/server";
import { sendInquiryEmail } from "@/lib/email/inquiry";
import { getHostawayClient } from "@/lib/hostaway";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/booking/inquiry — delivers a guest's message to the owner by
 * email (Brevo). Answers 503 when email is not configured so the dialog can
 * fall back to a mailto link.
 *
 * Abuse limits are deliberately simple: a hidden honeypot field, field
 * length caps, and small per-instance allowances (per caller address, per
 * guest email, and overall) that are charged only once an email was sent,
 * so a misconfigured mail provider does not turn into a misleading 429.
 */
const RECENT = new Map<string, number[]>();
const WINDOW_MS = 60 * 60_000;
const MAX_PER_KEY = 8;
const MAX_GLOBAL = 30;
const GLOBAL_KEY = "*all*";

function recentHits(key: string): number[] {
  const now = Date.now();
  const hits = (RECENT.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  RECENT.set(key, hits);
  return hits;
}

function withinAllowance(key: string): boolean {
  return recentHits(key).length < (key === GLOBAL_KEY ? MAX_GLOBAL : MAX_PER_KEY);
}

function recordHit(key: string): void {
  recentHits(key).push(Date.now());
  if (RECENT.size > 5000) RECENT.clear();
}

/** The caller's address as the host reports it (Vercel, then Netlify), else the first forwarded hop. */
function callerIp(req: Request): string {
  return (
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-nf-client-connection-ip")?.trim() ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = parseBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (parsed.honeypot) {
    // A bot filled the hidden field; pretend it worked and drop it.
    return NextResponse.json({ ok: true });
  }

  const ip = callerIp(req);
  const emailKey = parsed.email.toLowerCase();
  if (!withinAllowance(ip) || !withinAllowance(emailKey) || !withinAllowance(GLOBAL_KEY)) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }

  let listingName = parsed.listingName;
  try {
    const client = getHostawayClient();
    if (!(await client.isConfiguredListing(parsed.listingId))) {
      return NextResponse.json({ error: "Unknown listing" }, { status: 404 });
    }
    listingName = (await client.getListing(parsed.listingId)).name;
  } catch (err) {
    console.error("[booking/inquiry] listing lookup failed:", err);
    // Still deliver the message; the owner can work out the house from the id.
  }

  const result = await sendInquiryEmail({ ...parsed, listingName });
  if (result.skipped) {
    // Which variable is missing stays in the server log, not in the response.
    console.warn(`[booking/inquiry] not sent: ${result.skipped}`);
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (result.error) {
    console.error(`[booking/inquiry] send failed: ${result.error}`);
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
  recordHit(ip);
  recordHit(emailKey);
  recordHit(GLOBAL_KEY);
  console.log(`[booking/inquiry] delivered inquiry for ${parsed.listingId} (${result.id})`);
  return NextResponse.json({ ok: true, id: result.id });
}

type Parsed = {
  listingId: string;
  listingName: string;
  name: string;
  email: string;
  phone?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  message?: string;
  locale: "en" | "zh-CN";
  honeypot: boolean;
};

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length > max ? s.slice(0, max) : s;
}

function parseBody(body: unknown): Parsed | { error: string } {
  if (!body || typeof body !== "object") return { error: "Expected an object." };
  const b = body as Record<string, unknown>;
  const listingId = str(b.listingId, 100);
  if (!listingId) return { error: "listingId is required." };
  const name = str(b.name, 100);
  if (!name) return { error: "name is required." };
  const email = str(b.email, 100);
  if (!email || !EMAIL.test(email)) return { error: "a valid email is required." };
  const checkIn = str(b.checkIn, 10);
  const checkOut = str(b.checkOut, 10);
  if (!checkIn || !checkOut || !DATE.test(checkIn) || !DATE.test(checkOut) || checkOut <= checkIn) {
    return { error: "checkIn and checkOut must be YYYY-MM-DD with checkOut after checkIn." };
  }
  const guests = typeof b.guests === "number" ? b.guests : Number(b.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > 50) return { error: "guests must be between 1 and 50." };
  return {
    listingId,
    listingName: str(b.listingName, 200) || listingId,
    name,
    email,
    phone: str(b.phone, 50) || undefined,
    checkIn,
    checkOut,
    guests,
    message: str(b.message, 2000) || undefined,
    locale: b.locale === "zh-CN" ? "zh-CN" : "en",
    honeypot: typeof b.website === "string" && b.website.trim().length > 0,
  };
}
