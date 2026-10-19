/**
 * Minimal iCalendar (.ics) reader for availability feeds.
 *
 * Airbnb, Booking.com and Hospitable publish a feed per listing whose VEVENTs
 * are the booked or blocked date ranges. We only need the nights each event
 * occupies, so this parses DTSTART / DTEND / STATUS / SUMMARY and nothing
 * else. Dates are the common `VALUE=DATE` form (DTEND exclusive); date-times
 * are reduced to their calendar date, in New Zealand time for UTC values.
 */

export interface IcsEvent {
  /** First night, YYYY-MM-DD. */
  start: string;
  /** Exclusive end, YYYY-MM-DD (the check-out day). */
  end: string;
  summary?: string;
  status?: string;
  uid?: string;
}

const NZ_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Pacific/Auckland",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Unfold continuation lines (RFC 5545 §3.1) and split into logical lines. */
function logicalLines(text: string): string[] {
  return text
    .replace(/\r\n[ \t]/g, "")
    .replace(/\n[ \t]/g, "")
    .split(/\r?\n/);
}

/** "DTSTART;VALUE=DATE:20261201" -> { name, params, value }. */
function parseLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [rawName, ...rawParams] = head.split(";");
  const params: Record<string, string> = {};
  for (const p of rawParams) {
    const eq = p.indexOf("=");
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name: rawName.trim().toUpperCase(), params, value: value.trim() };
}

/** An iCalendar DATE or DATE-TIME value as a YYYY-MM-DD calendar date. */
export function icsDate(value: string, params: Record<string, string> = {}): string | null {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss, z] = m;
  const isDate = params.VALUE === "DATE" || hh === undefined;
  if (isDate || !z) {
    // A pure date, or a local/floating time: the calendar date is what was written.
    return `${y}-${mo}-${d}`;
  }
  // UTC instant: the night it belongs to is its date in New Zealand.
  const utc = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss ?? "0")));
  return NZ_DATE.format(utc);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: Partial<IcsEvent> | null = null;
  for (const raw of logicalLines(text)) {
    const line = parseLine(raw);
    if (!line) continue;
    if (line.name === "BEGIN" && line.value.toUpperCase() === "VEVENT") {
      current = {};
      continue;
    }
    if (line.name === "END" && line.value.toUpperCase() === "VEVENT") {
      if (current?.start) {
        const end = current.end && current.end > current.start ? current.end : addDaysISO(current.start, 1);
        events.push({ ...current, start: current.start, end } as IcsEvent);
      }
      current = null;
      continue;
    }
    if (!current) continue;
    switch (line.name) {
      case "DTSTART":
        current.start = icsDate(line.value, line.params) ?? undefined;
        break;
      case "DTEND":
        current.end = icsDate(line.value, line.params) ?? undefined;
        break;
      case "SUMMARY":
        current.summary = unescapeText(line.value);
        break;
      case "STATUS":
        current.status = line.value.toUpperCase();
        break;
      case "UID":
        current.uid = line.value;
        break;
      default:
        break;
    }
  }
  return events.filter((e) => e.status !== "CANCELLED");
}

function unescapeText(s: string): string {
  return s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\;/g, ";").replace(/\\\\/g, "\\");
}

/**
 * The nights (YYYY-MM-DD, inclusive of `start`..`end`) that any event
 * occupies. An event from Dec 1 to Dec 3 occupies the nights of Dec 1 and 2:
 * the check-out day stays free for a new arrival.
 */
export function blockedNights(events: IcsEvent[], start: string, end: string): Set<string> {
  const out = new Set<string>();
  for (const e of events) {
    if (e.end <= start || e.start > end) continue;
    for (let d = e.start < start ? start : e.start; d < e.end && d <= end; d = addDaysISO(d, 1)) {
      out.add(d);
    }
  }
  return out;
}
