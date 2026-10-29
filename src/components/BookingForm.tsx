"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DateRangeModal } from "./DateRangeModal";
import { InquiryDialog } from "./InquiryDialog";

type Props = {
  listingId: string;
  listingName: string;
  /** Null when the home's capacity isn't set. */
  maxGuests: number | null;
  minNights: number;
  inquiryEmail: string | null;
  defaultCheckIn: string | null;
  defaultCheckOut: string | null;
};

/** Upper bound for the guest picker when a home's capacity isn't set. */
const GUEST_PICKER_FALLBACK = 6;

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

/**
 * Inquiry-only booking panel: the guest picks dates + party size and sends
 * them to the host, who confirms availability and price by reply. There's no
 * online payment and no live calendar behind it.
 */
export function BookingForm({
  listingId,
  listingName,
  maxGuests,
  minNights,
  inquiryEmail,
  defaultCheckIn,
  defaultCheckOut,
}: Props) {
  const t = useTranslations("Booking");
  const locale = useLocale();

  const [checkIn, setCheckIn] = useState(defaultCheckIn ?? "");
  const [checkOut, setCheckOut] = useState(defaultCheckOut ?? "");
  const [guests, setGuests] = useState(Math.min(2, maxGuests || 2));
  const [showInquiry, setShowInquiry] = useState(false);
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
      <header className="mb-4">
        <h3 className="text-lg font-semibold text-kiwi-900">{t("title")}</h3>
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
          {Array.from(
            { length: Math.max(maxGuests ?? GUEST_PICKER_FALLBACK, 1) },
            (_, i) => i + 1,
          ).map((n) => (
            <option key={n} value={n}>
              {t("guestCount", { count: n })}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => setShowInquiry(true)}
        className="mt-4 w-full rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700"
      >
        {t("inquire")}
      </button>
      <p className="mt-2 text-center text-[11px] text-kiwi-600">
        {t("inquiryNote")}
      </p>

      {showDates && (
        <DateRangeModal
          listingId={listingId}
          initialCheckIn={checkIn || null}
          initialCheckOut={checkOut || null}
          minNights={minNights}
          checkAvailability={false}
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
    </section>
  );
}
