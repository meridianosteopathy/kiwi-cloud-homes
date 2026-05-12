"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";
import {
  findDistrict,
  localizedName,
  nearbySchools,
  RADIUS_KM,
  type AppLocale,
  type School,
  type ZoneStatus,
} from "@/lib/schools";

type Props = {
  selectedSchoolId: string | null;
};

const ZONE_PILL: Record<ZoneStatus, string> = {
  "in-zone": "bg-emerald-50 text-emerald-700 border-emerald-200",
  nearby: "bg-amber-50 text-amber-800 border-amber-200",
  further: "bg-orange-50 text-orange-800 border-orange-200",
  "out-of-region": "bg-rose-50 text-rose-800 border-rose-200",
};

export function SchoolSearch({ selectedSchoolId }: Props) {
  const t = useTranslations("SchoolSearch");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [filter, setFilter] = useState("");

  const all = useMemo(() => nearbySchools(), []);
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (s) =>
        s.name.en.toLowerCase().includes(q) ||
        s.name.zhCN.toLowerCase().includes(q),
    );
  }, [all, filter]);

  function setSelected(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("school", id);
    else params.delete("school");
    const next = params.toString();
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname);
    });
  }

  return (
    <section className="rounded-2xl border border-kiwi-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-kiwi-900">{t("title")}</h2>
          <p className="mt-1 text-sm text-kiwi-700">
            {t("subtitle", { radius: RADIUS_KM })}
          </p>
        </div>
        {selectedSchoolId && (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="rounded-full border border-kiwi-200 px-3 py-1 text-xs text-kiwi-700 hover:bg-kiwi-50"
          >
            {t("clear")}
          </button>
        )}
      </header>

      <label className="block">
        <span className="sr-only">{t("filterLabel")}</span>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t("filterPlaceholder")}
          autoComplete="off"
          className="w-full rounded-lg border border-kiwi-200 bg-white px-3 py-2 text-sm text-kiwi-900 shadow-sm placeholder:text-kiwi-400 focus:border-kiwi-500 focus:outline-none focus:ring-2 focus:ring-kiwi-200"
        />
      </label>

      <ul className="mt-3 max-h-[24rem] divide-y divide-kiwi-100 overflow-y-auto rounded-lg border border-kiwi-100">
        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-kiwi-500">
            {t("noMatches")}
          </li>
        )}
        {visible.map((s) => (
          <SchoolRow
            key={s.id}
            school={s}
            selected={s.id === selectedSchoolId}
            locale={locale}
            zoneLabel={t(`zone.${s.zone}`)}
            onSelect={() => setSelected(s.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function SchoolRow({
  school,
  selected,
  locale,
  zoneLabel,
  onSelect,
}: {
  school: School;
  selected: boolean;
  locale: AppLocale;
  zoneLabel: string;
  onSelect: () => void;
}) {
  const district = findDistrict(school.districtId);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={
          "flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition " +
          (selected ? "bg-kiwi-50" : "hover:bg-kiwi-50/60")
        }
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-kiwi-900">
            {localizedName(school, locale)}
          </div>
          {district && (
            <div className="truncate text-xs text-kiwi-600">
              {localizedName(district, locale)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ZONE_PILL[school.zone]}`}
          >
            {zoneLabel}
          </span>
          <span className="text-xs tabular-nums text-kiwi-700">
            {school.distanceKm} km
          </span>
        </div>
      </button>
    </li>
  );
}
