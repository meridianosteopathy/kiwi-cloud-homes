import { useTranslations } from "next-intl";

/**
 * Prominent value-prop banner on /tourist (and reusable elsewhere):
 * "Book direct, skip the Airbnb / Booking.com platform fee."
 *
 * The 10–15% number is industry-typical (Airbnb adds ~14–16% guest service
 * fee on top of the nightly; Booking.com loads ~15% commission into the
 * displayed price). Wording stays soft ("around", "typically") so we don't
 * overpromise.
 */
export function DirectBookingBanner() {
  const t = useTranslations("DirectBooking");

  return (
    <section className="rounded-2xl border border-kiwi-600/30 bg-gradient-to-r from-kiwi-50 to-emerald-50 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-kiwi-600 text-white"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M12 1v22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          <div>
            <h3 className="text-base font-semibold text-kiwi-900">
              {t("title")}
            </h3>
            <p className="mt-1 text-sm text-kiwi-800">{t("subtitle")}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start sm:self-center">
          <span className="rounded-full bg-kiwi-600 px-3 py-1 text-xs font-semibold text-white">
            {t("savingsBadge")}
          </span>
        </div>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-kiwi-700">
        {t("disclaimer")}
      </p>
    </section>
  );
}
