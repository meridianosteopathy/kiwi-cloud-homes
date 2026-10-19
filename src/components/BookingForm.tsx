"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { isStripeTestMode } from "@/lib/stripe/mode";
import { CheckoutDialog } from "./CheckoutDialog";
import { DateRangeModal } from "./DateRangeModal";
import { InquiryDialog } from "./InquiryDialog";

type Props = {
  listingId: string;
  listingName: string;
  basePrice: { amount: number; currency: string };
  /** Flat cleaning fee per stay, shown as a line in the estimate. */
  cleaningFee?: number;
  maxGuests: number;
  minNights: number;
  maxNights: number;
  inquiryEmail: string | null;
  /** False when guests send an inquiry instead of paying here. */
  directBooking?: boolean;
  defaultCheckIn: string | null;
  defaultCheckOut: string | null;
};

/** Guest-count dropdown size when a home's capacity is not known. */
const UNKNOWN_CAPACITY_GUESTS = 8;

type QuoteResponse = {
  nights: number;
  currency: string;
  total: number;
  breakdown: Array<{
    label: "nightly" | "cleaning";
    amount: number;
    meta?: { nights?: number; nightly?: number };
  }>;
};

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn + "T00:00:00Z").getTime();
  const b = new Date(checkOut + "T00:00:00Z").getTime();
  const diff = Math.round((b - a) / 86_400_000);
  return diff > 0 ? diff : 0;
}

function formatDate(iso: string, locale: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BookingForm({
  listingId,
  listingName,
  basePrice,
  cleaningFee = 0,
  maxGuests,
  minNights,
  maxNights,
  inquiryEmail,
  directBooking = true,
  defaultCheckIn,
  defaultCheckOut,
}: Props) {
  const t = useTranslations("Booking");
  const guestCapacity = maxGuests > 0 ? maxGuests : UNKNOWN_CAPACITY_GUESTS;
  const hasPrice = basePrice.amount > 0;
  const format = useFormatter();
  const locale = useLocale();
  const testMode = isStripeTestMode();

  const [checkIn, setCheckIn] = useState(defaultCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(defaultCheckOut ?? "");
  const [guests, setGuests] = useState(Math.min(2, maxGuests || 2));
  const [showInquiry, setShowInquiry] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showDates, setShowDates] = useState(false);

  // When the school journey changes ?month, the page passes new defaults
  // through. Sync our state so the date pills reflect the new selection
  // without forcing the guest to re-pick.
  useEffect(() => {
    setCheckIn(defaultCheckIn ?? "");
    setCheckOut(defaultCheckOut ?? "");
  }, [defaultCheckIn, defaultCheckOut]);

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const meetsMin = nights >= minNights;
  const meetsMax = !(maxNights > 0 && nights > maxNights);
  const canBook = nights > 0 && meetsMin && meetsMax;

  // Live quote so the breakdown matches what the checkout modal will show.
  // Falls back to listing.basePrice when the dates aren't yet valid or
  // the request fails — same shape, different (less accurate) source.
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  // A 4xx from the quote means the stay itself is not allowed (dates taken,
  // a per-date minimum stay, a no-check-in day, too many guests). Show why
  // and hold the button; a 5xx keeps the estimate so a hiccup does not
  // block the guest, and checkout re-quotes anyway.
  const [quoteRefusal, setQuoteRefusal] = useState<{ code?: string; message: string } | null>(null);

  useEffect(() => {
    // Inquiry-only sites never quote: the host confirms the price by email.
    if (!canBook || !directBooking) {
      setQuote(null);
      setQuoteRefusal(null);
      setQuoteLoading(false);
      return;
    }
    const controller = new AbortController();
    setQuoteLoading(true);
    fetch("/api/booking/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listingId, checkIn, checkOut, guests }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
          throw Object.assign(new Error(data.error ?? `${res.status}`), {
            status: res.status,
            code: data.code,
          });
        }
        return (await res.json()) as QuoteResponse;
      })
      .then((q) => {
        setQuote(q);
        setQuoteRefusal(null);
        setQuoteLoading(false);
      })
      .catch((err: Error & { status?: number; code?: string }) => {
        if (err.name === "AbortError") return;
        setQuote(null);
        setQuoteRefusal(
          err.status && err.status >= 400 && err.status < 500
            ? { code: err.code, message: err.message }
            : null,
        );
        setQuoteLoading(false);
      });
    return () => controller.abort();
  }, [canBook, directBooking, listingId, checkIn, checkOut, guests]);

  const refusalText = quoteRefusal
    ? quoteRefusal.code && t.has(`quoteError.${quoteRefusal.code}`)
      ? t(`quoteError.${quoteRefusal.code}`)
      : quoteRefusal.message
    : null;

  const priceLabel = (amount: number) =>
    format.number(amount, {
      style: "currency",
      currency: quote?.currency || basePrice.currency,
      maximumFractionDigits: 0,
    });

  const inputClass =
    "w-full rounded-lg border border-kiwi-200 bg-white px-3 py-2 text-sm text-kiwi-900 shadow-sm focus:border-kiwi-500 focus:outline-none focus:ring-2 focus:ring-kiwi-200";

  function applyDates(from: string | null, to: string | null) {
    setCheckIn(from ?? "");
    setCheckOut(to ?? "");
  }

  const datePill =
    "flex flex-col items-start rounded-xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-kiwi-200";

  return (
    <section className="rounded-2xl border border-kiwi-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold text-kiwi-900">
          {t(directBooking ? "title" : "titleInquiry")}
        </h3>
        <div className="text-right">
          {hasPrice ? (
            <>
              <div className="text-base font-semibold text-kiwi-900">
                {t("fromPrice", { price: priceLabel(basePrice.amount) })}
              </div>
              <div className="text-xs text-kiwi-600">{t("perNight")}</div>
            </>
          ) : (
            <div className="text-sm font-semibold text-kiwi-900">{t("priceOnRequest")}</div>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setShowDates(true)}
          className={
            datePill +
            " " +
            (checkIn
              ? "border-kiwi-600 bg-white hover:bg-kiwi-50"
              : "border-kiwi-200 bg-white hover:border-kiwi-400")
          }
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-kiwi-700">
            {t("checkIn")}
          </span>
          <span className="text-sm text-kiwi-900">
            {checkIn ? formatDate(checkIn, locale) : t("pickDate")}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowDates(true)}
          className={
            datePill +
            " " +
            (checkOut
              ? "border-kiwi-600 bg-white hover:bg-kiwi-50"
              : "border-kiwi-200 bg-white hover:border-kiwi-400")
          }
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-kiwi-700">
            {t("checkOut")}
          </span>
          <span className="text-sm text-kiwi-900">
            {checkOut ? formatDate(checkOut, locale) : t("pickDate")}
          </span>
        </button>
      </div>

      {minNights > 1 && (
        <p
          className={
            "mt-2 text-[11px] " +
            (nights > 0 && !meetsMin ? "text-rose-700" : "text-kiwi-600")
          }
        >
          {t("minNightsHint", { count: minNights })}
        </p>
      )}

      <label className="mt-3 block">
        <span className="mb-1 block text-xs font-medium text-kiwi-700">
          {t("guests")}
        </span>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className={inputClass}
        >
          {Array.from({ length: guestCapacity }, (_, i) => i + 1).map(
            (n) => (
              <option key={n} value={n}>
                {t("guestCount", { count: n })}
              </option>
            ),
          )}
        </select>
      </label>

      {nights > 0 && refusalText && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800" role="status">
          {refusalText}
        </p>
      )}

      {nights > 0 && !refusalText && (quote || hasPrice) && (
        <dl className="mt-4 space-y-1 rounded-lg bg-kiwi-50/60 p-3 text-sm">
          {quote ? (
            <>
              {quote.breakdown.map((line, i) => (
                <div key={i} className="flex items-baseline justify-between">
                  <dt className="text-kiwi-700">
                    {line.label === "nightly" && line.meta?.nightly !== undefined
                      ? t("breakdown", {
                          price: priceLabel(line.meta.nightly),
                          nights: line.meta.nights ?? quote.nights,
                        })
                      : t(`lineLabel.${line.label}`)}
                  </dt>
                  <dd className="tabular-nums text-kiwi-900">{priceLabel(line.amount)}</dd>
                </div>
              ))}
              <div className="flex items-baseline justify-between border-t border-kiwi-100 pt-1 font-semibold">
                <dt className="text-kiwi-900">{t("total")}</dt>
                <dd className="tabular-nums text-kiwi-900">{priceLabel(quote.total)}</dd>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <dt className="text-kiwi-700">
                  {t("breakdown", { price: priceLabel(basePrice.amount), nights })}
                </dt>
                <dd className="tabular-nums text-kiwi-900">
                  {quoteLoading ? t("calculating") : priceLabel(nights * basePrice.amount)}
                </dd>
              </div>
              {cleaningFee > 0 && (
                <>
                  <div className="flex items-baseline justify-between">
                    <dt className="text-kiwi-700">{t("lineLabel.cleaning")}</dt>
                    <dd className="tabular-nums text-kiwi-900">{priceLabel(cleaningFee)}</dd>
                  </div>
                  <div className="flex items-baseline justify-between border-t border-kiwi-100 pt-1 font-semibold">
                    <dt className="text-kiwi-900">{t("estimatedTotal")}</dt>
                    <dd className="tabular-nums text-kiwi-900">
                      {quoteLoading ? t("calculating") : priceLabel(nights * basePrice.amount + cleaningFee)}
                    </dd>
                  </div>
                </>
              )}
              <p className="pt-1 text-[11px] text-kiwi-600">
                {t(directBooking ? "estimateNote" : "estimateInquiryNote")}
              </p>
            </>
          )}
        </dl>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {directBooking ? (
          <>
            <button
              type="button"
              onClick={() => setShowCheckout(true)}
              disabled={!canBook || Boolean(quoteRefusal)}
              className="flex-1 rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700 disabled:cursor-not-allowed disabled:bg-kiwi-300"
            >
              {t("bookNow")}
            </button>
            <button
              type="button"
              onClick={() => setShowInquiry(true)}
              className="flex-1 rounded-full border border-kiwi-600 px-4 py-2 text-sm font-medium text-kiwi-700 hover:bg-kiwi-50"
            >
              {t("inquire")}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setShowInquiry(true)}
            className="flex-1 rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700"
          >
            {t("inquire")}
          </button>
        )}
      </div>

      {directBooking && testMode && (
        <p className="mt-2 text-center text-[11px] text-amber-700">
          {t("testModeNotice")}
        </p>
      )}

      {showDates && (
        <DateRangeModal
          listingId={listingId}
          initialCheckIn={checkIn || null}
          initialCheckOut={checkOut || null}
          minNights={minNights}
          onClose={() => setShowDates(false)}
          onApply={applyDates}
        />
      )}

      {showInquiry && (
        <InquiryDialog
          listingId={listingId}
          listingName={listingName}
          inquiryEmail={inquiryEmail}
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialGuests={guests}
          locale={locale}
          onClose={() => setShowInquiry(false)}
        />
      )}

      {showCheckout && (
        <CheckoutDialog
          listingId={listingId}
          listingName={listingName}
          initialCheckIn={checkIn}
          initialCheckOut={checkOut}
          initialGuests={guests}
          onClose={() => setShowCheckout(false)}
        />
      )}
    </section>
  );
}
