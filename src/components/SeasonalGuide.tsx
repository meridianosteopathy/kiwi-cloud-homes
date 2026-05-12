"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";
import {
  findSeason,
  SEASONS,
  type AvailabilityBand,
  type PriceBand,
  type SeasonId,
} from "@/lib/seasons";

type Props = {
  selectedSeasonId: SeasonId | null;
  selectedMonth: number | null;
};

const PRICE_DOT: Record<PriceBand, string> = {
  low: "bg-emerald-400",
  medium: "bg-amber-300",
  high: "bg-orange-400",
  peak: "bg-rose-500",
};

const AVAIL_DOT: Record<AvailabilityBand, string> = {
  open: "bg-emerald-400",
  tight: "bg-amber-400",
  "very-tight": "bg-rose-500",
};

export function SeasonalGuide({ selectedSeasonId, selectedMonth }: Props) {
  const t = useTranslations("Seasons");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedSeason = selectedSeasonId ? findSeason(selectedSeasonId) : undefined;
  const activeMonth = selectedMonth ?? selectedSeason?.defaultMonth ?? null;

  function setSeason(id: SeasonId) {
    const s = findSeason(id);
    if (!s) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("season", id);
    params.set("month", String(s.defaultMonth));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  function setMonth(month: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", String(month));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <section className="rounded-2xl border border-kiwi-200 bg-white p-5 shadow-sm">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-kiwi-900">{t("title")}</h2>
        <p className="mt-1 text-sm text-kiwi-700">{t("subtitle")}</p>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SEASONS.map((s) => {
          const active = s.id === selectedSeasonId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSeason(s.id)}
              className={
                "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition " +
                (active
                  ? "border-kiwi-600 bg-kiwi-50"
                  : "border-kiwi-200 bg-white hover:border-kiwi-400")
              }
              aria-pressed={active}
            >
              <span className="text-sm font-semibold text-kiwi-900">
                {t(`names.${s.id}`)}
              </span>
              <span className="text-xs text-kiwi-700">
                {t(`monthsShort.${s.id}`)}
              </span>
              <span className="flex items-center gap-2 text-[11px] text-kiwi-700">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${PRICE_DOT[s.priceBand]}`}
                  aria-hidden
                />
                {t(`priceBand.${s.priceBand}`)}
              </span>
              <span className="flex items-center gap-2 text-[11px] text-kiwi-700">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${AVAIL_DOT[s.availabilityBand]}`}
                  aria-hidden
                />
                {t(`availabilityBand.${s.availabilityBand}`)}
              </span>
            </button>
          );
        })}
      </div>

      {selectedSeason && (
        <div className="mt-5 rounded-xl bg-kiwi-50/60 p-4">
          <p className="text-sm font-medium text-kiwi-900">
            {t(`names.${selectedSeason.id}`)} ·{" "}
            <span className="text-kiwi-700">{t(`advice.${selectedSeason.id}`)}</span>
          </p>

          <div className="mt-3">
            <span className="block text-xs font-medium text-kiwi-700">
              {t("monthPicker")}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedSeason.months.map((m) => {
                const isActive = activeMonth === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonth(m)}
                    aria-pressed={isActive}
                    className={
                      "rounded-full border px-3 py-1 text-xs transition " +
                      (isActive
                        ? "border-kiwi-600 bg-kiwi-600 text-white"
                        : "border-kiwi-200 bg-white text-kiwi-800 hover:bg-kiwi-50")
                    }
                  >
                    {t(`monthsLong.${m}`)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
