/**
 * Which iCal feeds each home has, and their cached contents.
 *
 * Feed URLs carry a secret, so they live in the environment, not in the
 * repo: one variable per home, named after the home's `key` in
 * src/content/homes.ts, holding one or more URLs separated by commas or
 * whitespace. "bealey-ave" -> ICAL_BEALEY_AVE.
 *
 * Feeds are re-read every ten minutes. When a feed cannot be fetched the
 * last good copy is used for up to a day, so a flaky calendar host does not
 * blank the picker; with no copy at all the home shows as available and the
 * owner confirms by hand, which is what an inquiry is for anyway.
 */

import { blockedNights, parseIcs, type IcsEvent } from "./ical";

const FRESH_MS = 10 * 60_000;
const STALE_MAX_MS = 24 * 60 * 60_000;
const FETCH_TIMEOUT_MS = 10_000;

type CacheEntry = { events: IcsEvent[]; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const warnedNoFeeds = new Set<string>();

export function icalEnvName(homeKey: string): string {
  return "ICAL_" + homeKey.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const warnedTokens = new Set<string>();

/**
 * The feed links configured for a home. Accepts http(s) and webcal links
 * (webcal is what calendar apps' "subscribe" buttons hand out; it is https
 * underneath), tolerates surrounding quotes, and says so when a value is
 * dropped, so a pasted link that does not work is never mistaken for
 * "nothing configured".
 */
export function icalUrlsFor(homeKey: string): string[] {
  const raw = process.env[icalEnvName(homeKey)] ?? "";
  const out: string[] = [];
  for (const token of raw.split(/[\s,]+/)) {
    let s = token.trim().replace(/^["']+|["']+$/g, "");
    if (!s) continue;
    s = s.replace(/^webcal:\/\//i, "https://");
    let url: URL | null = null;
    try {
      url = new URL(s);
    } catch {
      url = null;
    }
    if (!url || !/^https?:$/.test(url.protocol)) {
      const mark = `${homeKey}:${s}`;
      if (!warnedTokens.has(mark)) {
        warnedTokens.add(mark);
        console.warn(
          `[standalone] ignoring a value in ${icalEnvName(homeKey)}: not an http(s) or webcal link (starts "${s.split(/[/?#]/)[0].slice(0, 20)}").`,
        );
      }
      continue;
    }
    out.push(url.toString());
  }
  return out;
}

async function fetchEvents(url: string): Promise<IcsEvent[]> {
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && now - hit.fetchedAt < FRESH_MS) return hit.events;
  try {
    const res = await fetch(url, {
      headers: { accept: "text/calendar, text/plain;q=0.8, */*;q=0.5" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("response is not an iCalendar file");
    const events = parseIcs(text);
    cache.set(url, { events, fetchedAt: now });
    return events;
  } catch (err) {
    // Node's own fetch errors can quote the full URL; keep the secret out of the logs.
    const reason = (err instanceof Error ? err.message : String(err)).split(url).join(redact(url));
    if (hit && now - hit.fetchedAt < STALE_MAX_MS) {
      console.warn(`[standalone] iCal feed ${redact(url)} failed (${reason}); using the copy from ${Math.round((now - hit.fetchedAt) / 60_000)} min ago.`);
      return hit.events;
    }
    throw new Error(`iCal feed ${redact(url)} failed: ${reason}`);
  }
}

/** Hide the secret part of a feed URL in logs. */
function redact(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname.length > 24 ? u.pathname.slice(0, 24) + "…" : u.pathname}`;
  } catch {
    return "feed";
  }
}

export interface BlockedNightsResult {
  nights: Set<string>;
  /** How many feeds are configured for the home. */
  feeds: number;
  /** How many of them could not be read this time (and had no usable copy). */
  failed: number;
}

export async function blockedNightsFor(homeKey: string, start: string, end: string): Promise<BlockedNightsResult> {
  const urls = icalUrlsFor(homeKey);
  if (urls.length === 0) {
    if (!warnedNoFeeds.has(homeKey)) {
      const raw = (process.env[icalEnvName(homeKey)] ?? "").trim();
      console.warn(
        raw
          ? `[standalone] ${icalEnvName(homeKey)} is set but holds no usable link; every date for "${homeKey}" shows as available.`
          : `[standalone] no iCal feed configured for "${homeKey}" (set ${icalEnvName(homeKey)}); every date shows as available.`,
      );
      warnedNoFeeds.add(homeKey);
    }
    return { nights: new Set(), feeds: 0, failed: 0 };
  }
  const results = await Promise.allSettled(urls.map(fetchEvents));
  const nights = new Set<string>();
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled") {
      for (const n of blockedNights(r.value, start, end)) nights.add(n);
    } else {
      failed++;
      console.error(`[standalone] ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
    }
  }
  return { nights, feeds: urls.length, failed };
}

/** For tests: forget cached feeds. */
export function clearFeedCache(): void {
  cache.clear();
}
