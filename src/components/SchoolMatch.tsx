import { useLocale, useTranslations } from "next-intl";
import {
  findCity,
  findDistrict,
  findRegion,
  findSchool,
  localizedName,
  type AppLocale,
  type ZoneStatus,
} from "@/lib/schools";

type Props = {
  schoolId: string | null;
};

const ZONE_STYLES: Record<ZoneStatus, string> = {
  "in-zone": "bg-emerald-50 text-emerald-700 border-emerald-200",
  nearby: "bg-amber-50 text-amber-800 border-amber-200",
  further: "bg-orange-50 text-orange-800 border-orange-200",
  "out-of-region": "bg-rose-50 text-rose-800 border-rose-200",
};

// Rough urban estimates — good enough for "give me a feel" without a routing API.
// Walking ~5 km/h (12 min/km), driving ~40 km/h in Christchurch traffic (1.5 min/km).
const WALKING_MIN_PER_KM = 12;
const DRIVING_MIN_PER_KM = 1.5;

function estimateMinutes(distanceKm: number, minPerKm: number): number {
  return Math.max(1, Math.round(distanceKm * minPerKm));
}

export function SchoolMatch({ schoolId }: Props) {
  const t = useTranslations("SchoolMatch");
  const locale = useLocale() as AppLocale;
  const school = schoolId ? findSchool(schoolId) : undefined;

  if (!school) {
    return (
      <section className="rounded-2xl border border-dashed border-kiwi-200 bg-white p-5 text-center text-sm text-kiwi-600">
        {t("noSelection")}
      </section>
    );
  }

  const region = findRegion(school.regionId);
  const city = findCity(school.cityId);
  const district = findDistrict(school.districtId);

  const walkMin = estimateMinutes(school.distanceKm, WALKING_MIN_PER_KM);
  const driveMin = estimateMinutes(school.distanceKm, DRIVING_MIN_PER_KM);

  return (
    <section className="rounded-2xl border border-kiwi-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-kiwi-900">
            {localizedName(school, locale)}
          </h2>
          <p className="mt-1 text-xs text-kiwi-600">
            {[region, city, district]
              .filter(Boolean)
              .map((n) => localizedName(n!, locale))
              .join(" · ")}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${ZONE_STYLES[school.zone]}`}
        >
          {t(`zone.${school.zone}`)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-kiwi-50/60 p-3">
          <dt className="text-xs text-kiwi-600">{t("distance")}</dt>
          <dd className="mt-1 font-semibold text-kiwi-900">
            {school.distanceKm} km
          </dd>
        </div>
        <div className="rounded-lg bg-kiwi-50/60 p-3">
          <dt className="flex items-center gap-1.5 text-xs text-kiwi-600">
            <span aria-hidden>🚶</span>
            {t("walking")}
          </dt>
          <dd className="mt-1 font-semibold text-kiwi-900">
            {formatMinutes(walkMin, locale, t)}
          </dd>
        </div>
        <div className="rounded-lg bg-kiwi-50/60 p-3">
          <dt className="flex items-center gap-1.5 text-xs text-kiwi-600">
            <span aria-hidden>🚗</span>
            {t("driving")}
          </dt>
          <dd className="mt-1 font-semibold text-kiwi-900">
            {formatMinutes(driveMin, locale, t)}
          </dd>
        </div>
        <div className="rounded-lg bg-kiwi-50/60 p-3 sm:col-span-3">
          <dt className="text-xs text-kiwi-600">{t("advice")}</dt>
          <dd className="mt-1 text-kiwi-800">{t(`adviceText.${school.zone}`)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[10px] text-kiwi-500">{t("estimateNote")}</p>
    </section>
  );
}

function formatMinutes(
  total: number,
  locale: AppLocale,
  t: ReturnType<typeof useTranslations>,
): string {
  if (total < 60) {
    return t("durationMin", { min: total });
  }
  const hours = Math.floor(total / 60);
  const min = total % 60;
  if (min === 0) {
    return t("durationHour", { h: hours });
  }
  return t("durationHourMin", { h: hours, min });
}
