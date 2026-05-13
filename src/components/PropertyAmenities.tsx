"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { sortAmenities, type ResolvedAmenity } from "@/lib/amenities";
import type { Amenity } from "@/lib/hostaway";
import { AmenitiesModal } from "./AmenitiesModal";

type Props = {
  amenities: Amenity[];
};

const PREVIEW_COUNT = 8;

export function PropertyAmenities({ amenities }: Props) {
  const t = useTranslations("Amenities");
  const locale = useLocale();
  const [showAll, setShowAll] = useState(false);

  if (amenities.length === 0) return null;

  const resolved = sortAmenities(
    amenities,
    locale === "zh-CN" ? "zh-CN" : "en",
  );
  const preview = resolved.slice(0, PREVIEW_COUNT);
  const overflow = resolved.length - preview.length;

  return (
    <section className="mt-2 border-t border-kiwi-100 px-5 py-5">
      <h3 className="mb-3 text-lg font-semibold text-kiwi-900">{t("title")}</h3>
      <ul className="grid grid-cols-1 gap-y-2 text-sm text-kiwi-800 sm:grid-cols-2">
        {preview.map((a) => (
          <AmenityRow key={a.id} amenity={a} />
        ))}
      </ul>

      {overflow > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-4 rounded-xl border border-kiwi-900/15 px-4 py-2 text-sm font-medium text-kiwi-900 hover:bg-kiwi-50"
        >
          {t("showAll", { count: resolved.length })}
        </button>
      )}

      {showAll && (
        <AmenitiesModal
          amenities={resolved}
          onClose={() => setShowAll(false)}
        />
      )}
    </section>
  );
}

function AmenityRow({ amenity }: { amenity: ResolvedAmenity }) {
  return (
    <li className="flex items-center gap-2.5">
      <span aria-hidden className="text-base leading-none">
        {amenity.icon}
      </span>
      <span>{amenity.label}</span>
    </li>
  );
}
