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

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-kiwi-50/60 p-3">
          <dt className="text-xs text-kiwi-600">{t("distance")}</dt>
          <dd className="mt-1 font-semibold text-kiwi-900">
            {school.distanceKm} km
          </dd>
        </div>
        <div className="rounded-lg bg-kiwi-50/60 p-3">
          <dt className="text-xs text-kiwi-600">{t("advice")}</dt>
          <dd className="mt-1 text-kiwi-800">{t(`adviceText.${school.zone}`)}</dd>
        </div>
      </dl>
    </section>
  );
}
