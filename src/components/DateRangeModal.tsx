"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DayPicker, type DateRange } from "react-day-picker";
import { enUS, zhCN } from "date-fns/locale";
import "react-day-picker/style.css";

type Props = {
  initialCheckIn: string | null;
  initialCheckOut: string | null;
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

export function DateRangeModal({
  initialCheckIn,
  initialCheckOut,
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

  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function clear() {
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
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-kiwi-100 bg-white px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-kiwi-900">
              {t("title")}
            </h2>
            <p className="mt-1 text-xs text-kiwi-600">{t("subtitle")}</p>
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

          <DayPicker
            mode="range"
            selected={range}
            onSelect={setRange}
            numberOfMonths={2}
            disabled={{ before: startOfToday() }}
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
