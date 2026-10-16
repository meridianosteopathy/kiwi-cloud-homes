"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DayPicker, type DateRange, type Matcher } from "react-day-picker";
import { enUS, zhCN } from "date-fns/locale";
import "react-day-picker/style.css";

type Props = {
  /** Which home's calendar to grey out — each listing has its own. */
  listingId: string;
  initialCheckIn: string | null;
  initialCheckOut: string | null;
  /** Minimum nights enforced by Hostaway; default 1. */
  minNights?: number;
  onClose: () => void;
  /** Called with ISO YYYY-MM-DD strings (or null to clear). */
  onApply: (checkIn: string | null, checkOut: string | null) => void;
};

function parseISO(d: string | null): Date | undefined {
  if (!d) return undefined;
  const [y, m, day] = d.split("-").map(Number);
  if (!y || !m || !day) return undefined;
  return new Date(y, m - 1, day);
}

function toISO(d: Date | undefined): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

const AVAILABILITY_DAYS = 365; // ~12 months from today

export function DateRangeModal({
  listingId,
  initialCheckIn,
  initialCheckOut,
  minNights = 1,
  onClose,
  onApply,
}: Props) {
  const t = useTranslations("DatePicker");
  const locale = useLocale();
  const titleId = useId();

  const [range, setRange] = useState<DateRange | undefined>({
    from: parseISO(initialCheckIn),
    to: parseISO(initialCheckOut),
  });

  const [unavailable, setUnavailable] = useState<Date[]>([]);
  // Days the host allows stays to pass through but not to start or end on.
  const [noCheckIn, setNoCheckIn] = useState<Set<string>>(new Set());
  const [noCheckOut, setNoCheckOut] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState<"noCheckIn" | "noCheckOut" | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // Airbnb-style: two months side-by-side on desktop, single month on
  // narrow viewports where two months would either wrap (jarring) or
  // overflow horizontally.
  const [numberOfMonths, setNumberOfMonths] = useState(1);

  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setNumberOfMonths(mq.matches ? 2 : 1);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Fetch host calendar so unavailable nights can be greyed out upfront.
  useEffect(() => {
    let cancelled = false;
    const start = toISO(startOfToday());
    const end = toISO(addDays(startOfToday(), AVAILABILITY_DAYS));
    if (!start || !end) {
      setLoading(false);
      return;
    }

    fetch(
      `/api/booking/availability?listingId=${encodeURIComponent(listingId)}&start=${start}&end=${end}`,
    )
      .then(async (res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return (await res.json()) as {
          unavailable: string[];
          noCheckIn?: string[];
          noCheckOut?: string[];
        };
      })
      .then((data) => {
        if (cancelled) return;
        const dates = data.unavailable
          .map((iso) => parseISO(iso))
          .filter((d): d is Date => Boolean(d));
        setUnavailable(dates);
        setNoCheckIn(new Set(data.noCheckIn ?? []));
        setNoCheckOut(new Set(data.noCheckOut ?? []));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [listingId]);

  const disabled: Matcher[] = useMemo(
    () => [{ before: startOfToday() }, ...unavailable],
    [unavailable],
  );

  // When the guest has clicked a check-in but not a check-out, mark the
  // candidate checkout dates that would make a too-short stay so we can
  // outline them and show an Airbnb-style "N-night minimum" tooltip.
  const tooShortDates = useMemo(() => {
    if (!range?.from || range.to) return [];
    const out: Date[] = [];
    for (let i = 1; i < minNights; i++) {
      out.push(addDays(range.from, i));
    }
    return out;
  }, [range, minNights]);

  const tooltipText = t("minNightsTooltip", { count: minNights });

  // Custom DayButton: wraps the library's default button with a tooltip
  // span that becomes visible on hover/focus when the day is too-short.
  const dayComponents = useMemo(
    () => ({
      DayButton: ({ day, modifiers, ...buttonProps }: {
        day: { date: Date };
        modifiers: Record<string, boolean | undefined>;
      } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
        <button {...buttonProps}>
          {buttonProps.children}
          {modifiers?.tooShort ? (
            <span className="rdp-too-short-tooltip" role="tooltip">
              {tooltipText}
            </span>
          ) : null}
        </button>
      ),
    }),
    [tooltipText],
  );

  // Refuse a check-in on a no-check-in day or a check-out on a no-check-out
  // day at the moment it is clicked, and say why. The quote enforces the same
  // rule server-side; this just saves the guest a round trip.
  function select(next: DateRange | undefined, clicked: Date) {
    const iso = toISO(clicked);
    if (iso && next?.from && toISO(next.from) === iso && !next.to && noCheckIn.has(iso)) {
      setHint("noCheckIn");
      return;
    }
    if (iso && next?.to && toISO(next.to) === iso && noCheckOut.has(iso)) {
      setHint("noCheckOut");
      return;
    }
    setHint(null);
    setRange(next);
  }

  function clear() {
    setHint(null);
    setRange(undefined);
  }

  function apply() {
    onApply(toISO(range?.from), toISO(range?.to));
    onClose();
  }

  const fromLabel = range?.from
    ? range.from.toLocaleDateString(locale)
    : t("addDate");
  const toLabel = range?.to ? range.to.toLocaleDateString(locale) : t("addDate");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-kiwi-100 bg-white px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-kiwi-900">
              {t("title")}
            </h2>
            <p className="mt-1 text-xs text-kiwi-600">
              {minNights > 1
                ? t("minNightsHint", { count: minNights })
                : t("subtitle")}
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-full p-1 text-kiwi-600 hover:bg-kiwi-50 hover:text-kiwi-900"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </header>

        <div className="px-5 py-4">
          <div className="mb-4 grid grid-cols-2 gap-2">
            <div
              className={
                "rounded-xl border px-3 py-2 " +
                (range?.from
                  ? "border-kiwi-600 bg-white"
                  : "border-kiwi-200 bg-kiwi-50/50")
              }
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-kiwi-700">
                {t("checkIn")}
              </div>
              <div className="text-sm text-kiwi-900">{fromLabel}</div>
            </div>
            <div
              className={
                "rounded-xl border px-3 py-2 " +
                (range?.to
                  ? "border-kiwi-600 bg-white"
                  : "border-kiwi-200 bg-kiwi-50/50")
              }
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-kiwi-700">
                {t("checkOut")}
              </div>
              <div className="text-sm text-kiwi-900">{toLabel}</div>
            </div>
          </div>

          {loading && (
            <p className="mb-2 text-center text-xs text-kiwi-600">
              {t("loadingAvailability")}
            </p>
          )}
          {loadError && (
            <p className="mb-2 text-center text-xs text-amber-700">
              {t("availabilityFallback")}
            </p>
          )}

          {hint && (
            <p className="mb-2 text-center text-xs text-amber-700" role="status">
              {t(hint === "noCheckIn" ? "noCheckInHint" : "noCheckOutHint")}
            </p>
          )}

          <DayPicker
            mode="range"
            selected={range}
            onSelect={select}
            numberOfMonths={numberOfMonths}
            min={minNights}
            disabled={disabled}
            excludeDisabled
            modifiers={{ tooShort: tooShortDates }}
            modifiersClassNames={{ tooShort: "rdp-too-short" }}
            components={dayComponents}
            locale={locale === "zh-CN" ? zhCN : enUS}
            weekStartsOn={1}
            className="rdp-kiwi"
          />
        </div>

        <footer className="sticky bottom-0 flex items-center justify-between border-t border-kiwi-100 bg-white px-5 py-3">
          <button
            type="button"
            onClick={clear}
            disabled={!range?.from && !range?.to}
            className="text-sm text-kiwi-700 underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-kiwi-300 disabled:no-underline"
          >
            {t("clear")}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-kiwi-200 px-4 py-2 text-sm text-kiwi-700 hover:bg-kiwi-50"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={!range?.from || !range?.to}
              className="rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700 disabled:bg-kiwi-300"
            >
              {t("apply")}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
