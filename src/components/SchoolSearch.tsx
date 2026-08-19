"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";
import type { HomeSummary } from "@/content/homes";
import {
  distanceFrom,
  findDistrict,
  localizedName,
  nearbySchools,
  RADIUS_KM,
  SCHOOLS,
  snapshotDistance,
  type AppLocale,
  type School,
  type SchoolLevel,
  type SchoolWithDistance,
  type ZoneStatus,
} from "@/lib/schools";

type Props = {
  selectedSchoolId: string | null;
  /** Homes on the site; the list shows each school's distance to the nearest. */
  homes: HomeSummary[];
};

/** A school plus how far it is from whichever home is closest to it. */
type SchoolRowData = SchoolWithDistance & { nearestHomeName: string | null };

/**
 * Ranks schools by distance to the closest home. With one home this is just
 * that home's distances; with several, a school 1 km from either house reads
 * as 1 km rather than being buried behind the other house's number.
 *
 * Homes without coordinates in src/content/homes.ts can't be measured, so
 * they don't contribute. When no home can be measured at all, fall back to
 * the snapshot's own distances so the list still ranks sensibly.
 */
function rankSchools(homes: HomeSummary[]): SchoolRowData[] {
  const located = homes.filter((h) => h.coordinates);
  if (located.length === 0) {
    return nearbySchools().map((s) => ({
      ...s,
      ...snapshotDistance(s),
      nearestHomeName: null,
    }));
  }

  const rows: SchoolRowData[] = [];
  for (const school of SCHOOLS) {
    let best: SchoolRowData | null = null;
    for (const home of located) {
      const d = distanceFrom(school, home.coordinates!);
      if (!d) continue;
      if (!best || d.distanceKm < best.distanceKm) {
        best = { ...school, ...d, nearestHomeName: home.name };
      }
    }
    if (best && best.straightLineKm <= RADIUS_KM) rows.push(best);
  }
  return rows.sort((a, b) => a.distanceKm - b.distanceKm);
}

const LEVEL_ORDER: SchoolLevel[] = [
  "kindergarten",
  "primary",
  "intermediate",
  "secondary",
];

const ZONE_PILL: Record<ZoneStatus, string> = {
  "in-zone": "bg-emerald-50 text-emerald-700 border-emerald-200",
  nearby: "bg-amber-50 text-amber-800 border-amber-200",
  further: "bg-orange-50 text-orange-800 border-orange-200",
  "out-of-region": "bg-rose-50 text-rose-800 border-rose-200",
};

const LEVEL_PILL: Record<SchoolLevel, string> = {
  kindergarten: "bg-sky-50 text-sky-700 border-sky-200",
  primary: "bg-violet-50 text-violet-700 border-violet-200",
  intermediate: "bg-teal-50 text-teal-700 border-teal-200",
  secondary: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

// "Active" variant for chip-row level filter — same hue, stronger fill.
const LEVEL_CHIP_ACTIVE: Record<SchoolLevel, string> = {
  kindergarten: "bg-sky-600 text-white border-sky-600 hover:bg-sky-700",
  primary: "bg-violet-600 text-white border-violet-600 hover:bg-violet-700",
  intermediate: "bg-teal-600 text-white border-teal-600 hover:bg-teal-700",
  secondary: "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700",
};

export function SchoolSearch({ selectedSchoolId, homes }: Props) {
  const t = useTranslations("SchoolSearch");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [filter, setFilter] = useState("");
  const [levels, setLevels] = useState<Set<SchoolLevel>>(new Set());

  const multiHome = homes.filter((h) => h.coordinates).length > 1;
  const all = useMemo(() => rankSchools(homes), [homes]);
  const visible = useMemo(() => {
    let list = all;
    if (levels.size > 0) {
      list = list.filter((s) => levels.has(s.level));
    }
    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.en.toLowerCase().includes(q) ||
          s.name.zhCN.toLowerCase().includes(q),
      );
    }
    return list;
  }, [all, filter, levels]);

  function setSelected(id: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("school", id);
    else params.delete("school");
    const next = params.toString();
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname);
    });
  }

  function toggleLevel(level: SchoolLevel) {
    setLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }

  return (
    // min-w-0: the school rows truncate, and a nowrap row would otherwise set
    // this section's min-content width — as a grid item (min-width: auto by
    // default) that dragged the whole page wider than a phone screen.
    <section className="min-w-0 rounded-2xl border border-kiwi-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-kiwi-900">{t("title")}</h2>
          <p className="mt-1 text-sm text-kiwi-700">
            {multiHome
              ? t("subtitleMultiHome", { radius: RADIUS_KM })
              : t("subtitle", { radius: RADIUS_KM })}
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

      <div role="group" aria-label={t("levelFilterAria")} className="mb-3">
        <span className="sr-only">{t("levelFilterLabel")}</span>
        <div className="flex flex-wrap gap-2">
          {LEVEL_ORDER.map((level) => {
            const active = levels.has(level);
            return (
              <button
                key={level}
                type="button"
                onClick={() => toggleLevel(level)}
                aria-pressed={active}
                className={
                  "rounded-full border px-3 py-1 text-xs font-medium transition " +
                  (active
                    ? LEVEL_CHIP_ACTIVE[level]
                    : `${LEVEL_PILL[level]} hover:brightness-95`)
                }
              >
                {t(`level.${level}`)}
              </button>
            );
          })}
        </div>
      </div>

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
            levelLabel={t(`level.${s.level}`)}
            nearestHomeLabel={
              multiHome && s.nearestHomeName
                ? t("nearestHome", { home: s.nearestHomeName })
                : null
            }
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
  levelLabel,
  nearestHomeLabel,
  onSelect,
}: {
  school: School;
  selected: boolean;
  locale: AppLocale;
  zoneLabel: string;
  levelLabel: string;
  /** Which home the distance is measured from; null when there's only one. */
  nearestHomeLabel: string | null;
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
          "flex w-full flex-col gap-1 px-3 py-2.5 text-left transition " +
          (selected ? "bg-kiwi-50" : "hover:bg-kiwi-50/60")
        }
      >
        {/* The name gets the full row width and wraps rather than truncating —
            on a phone there isn't room for a name and two pills side by side,
            and a half-shown school name is the one thing this list can't
            afford to hide. The pills sit on their own row underneath. */}
        <div className="flex w-full items-start justify-between gap-2">
          <span className="text-sm font-medium text-kiwi-900">
            {localizedName(school, locale)}
          </span>
          <span className="shrink-0 pt-0.5 text-xs tabular-nums text-kiwi-700">
            {school.distanceKm} km
          </span>
        </div>

        {district && (
          <div className="truncate text-xs text-kiwi-600">
            {localizedName(district, locale)}
          </div>
        )}
        {nearestHomeLabel && (
          <div className="truncate text-[11px] text-kiwi-500">
            {nearestHomeLabel}
          </div>
        )}

        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${LEVEL_PILL[school.level]}`}
          >
            {levelLabel}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ZONE_PILL[school.zone]}`}
          >
            {zoneLabel}
          </span>
        </div>
      </button>
    </li>
  );
}
