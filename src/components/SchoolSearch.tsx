"use client";

import { useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/routing";
import {
  citiesIn,
  districtsIn,
  findSchool,
  localizedName,
  REGIONS,
  schoolsIn,
  searchSchools,
  type AppLocale,
} from "@/lib/schools";

type Props = {
  /** Current selection from URL state. */
  selectedSchoolId: string | null;
};

export function SchoolSearch({ selectedSchoolId }: Props) {
  const t = useTranslations("SchoolSearch");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // Seed drill-down selection from URL (if a school is selected).
  const selectedSchool = selectedSchoolId ? findSchool(selectedSchoolId) : undefined;
  const [regionId, setRegionId] = useState<string>(
    selectedSchool?.regionId ?? "",
  );
  const [cityId, setCityId] = useState<string>(selectedSchool?.cityId ?? "");
  const [districtId, setDistrictId] = useState<string>(
    selectedSchool?.districtId ?? "",
  );

  // Name search state.
  const [query, setQuery] = useState("");
  const suggestions = useMemo(() => searchSchools(query, 6), [query]);

  const cities = regionId ? citiesIn(regionId) : [];
  const districts = cityId ? districtsIn(cityId) : [];
  const schools = districtId ? schoolsIn(districtId) : [];

  function updateSearchParam(name: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(name);
    } else {
      params.set(name, value);
    }
    const next = params.toString();
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname);
    });
  }

  function selectSchool(id: string) {
    const s = findSchool(id);
    if (!s) return;
    setRegionId(s.regionId);
    setCityId(s.cityId);
    setDistrictId(s.districtId);
    setQuery("");
    updateSearchParam("school", id);
  }

  function clearAll() {
    setRegionId("");
    setCityId("");
    setDistrictId("");
    setQuery("");
    updateSearchParam("school", null);
  }

  const selectClass =
    "w-full rounded-lg border border-kiwi-200 bg-white px-3 py-2 text-sm text-kiwi-900 shadow-sm focus:border-kiwi-500 focus:outline-none focus:ring-2 focus:ring-kiwi-200 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <section className="rounded-2xl border border-kiwi-200 bg-white p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-kiwi-900">{t("title")}</h2>
          <p className="mt-1 text-sm text-kiwi-700">{t("subtitle")}</p>
        </div>
        {selectedSchool && (
          <button
            type="button"
            onClick={clearAll}
            className="rounded-full border border-kiwi-200 px-3 py-1 text-xs text-kiwi-700 hover:bg-kiwi-50"
          >
            {t("clear")}
          </button>
        )}
      </header>

      {/* Name search */}
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-kiwi-700">
          {t("byName")}
        </span>
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("byNamePlaceholder")}
            className={selectClass}
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-kiwi-200 bg-white py-1 shadow-lg">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => selectSchool(s.id)}
                    className="block w-full px-3 py-2 text-left text-sm text-kiwi-900 hover:bg-kiwi-50"
                  >
                    {localizedName(s, locale)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </label>

      <div className="my-4 flex items-center gap-3 text-xs text-kiwi-500">
        <span className="h-px flex-1 bg-kiwi-100" />
        <span>{t("or")}</span>
        <span className="h-px flex-1 bg-kiwi-100" />
      </div>

      {/* Drill-down */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-kiwi-700">
            {t("region")}
          </span>
          <select
            value={regionId}
            onChange={(e) => {
              setRegionId(e.target.value);
              setCityId("");
              setDistrictId("");
            }}
            className={selectClass}
          >
            <option value="">{t("anyRegion")}</option>
            {REGIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {localizedName(r, locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-kiwi-700">
            {t("city")}
          </span>
          <select
            value={cityId}
            onChange={(e) => {
              setCityId(e.target.value);
              setDistrictId("");
            }}
            disabled={!regionId}
            className={selectClass}
          >
            <option value="">{regionId ? t("anyCity") : t("pickRegionFirst")}</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {localizedName(c, locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-kiwi-700">
            {t("district")}
          </span>
          <select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            disabled={!cityId}
            className={selectClass}
          >
            <option value="">{cityId ? t("anyDistrict") : t("pickCityFirst")}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {localizedName(d, locale)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-kiwi-700">
            {t("school")}
          </span>
          <select
            value={selectedSchoolId ?? ""}
            onChange={(e) => {
              if (e.target.value) selectSchool(e.target.value);
              else updateSearchParam("school", null);
            }}
            disabled={!districtId}
            className={selectClass}
          >
            <option value="">
              {districtId ? t("pickSchool") : t("pickDistrictFirst")}
            </option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {localizedName(s, locale)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
