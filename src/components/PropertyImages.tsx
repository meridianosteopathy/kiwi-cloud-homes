"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { ListingImage } from "@/lib/hostaway";
import { PhotoLightbox } from "./PhotoLightbox";

type Props = {
  images: ListingImage[];
  alt: string;
};

export function PropertyImages({ images, alt }: Props) {
  const t = useTranslations("PropertyImages");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(0);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-gradient-to-br from-kiwi-200 via-kiwi-100 to-kiwi-50">
        <div className="absolute inset-0 flex items-center justify-center text-sm text-kiwi-600">
          —
        </div>
      </div>
    );
  }

  function openAt(i: number) {
    setLightboxStart(i);
    setLightboxOpen(true);
  }

  // Airbnb-style 5-photo collage on tablet+; single hero on mobile.
  const grid = images.slice(0, 5);
  const hero = grid[0];
  const thumbs = grid.slice(1);
  const hasMoreOverlay = images.length > 1;

  return (
    <>
      <div className="relative">
        {/* Mobile: hero only. */}
        <button
          type="button"
          onClick={() => openAt(0)}
          aria-label={t("openGallery")}
          className="block w-full overflow-hidden rounded-xl sm:hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={hero.url}
            alt={hero.caption || alt}
            loading="eager"
            className="aspect-[16/10] w-full object-cover"
          />
        </button>

        {/* Tablet+: 5-photo collage. */}
        <div className="hidden aspect-[2/1] w-full overflow-hidden rounded-xl sm:grid sm:grid-cols-4 sm:grid-rows-2 sm:gap-2">
          <button
            type="button"
            onClick={() => openAt(0)}
            aria-label={t("openGallery")}
            className="relative col-span-2 row-span-2 overflow-hidden rounded-l-xl bg-kiwi-50 transition hover:opacity-95"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={hero.url}
              alt={hero.caption || alt}
              loading="eager"
              className="h-full w-full object-cover"
            />
          </button>

          {thumbs.map((img, i) => {
            const index = i + 1;
            const rounding =
              i === 1 ? "rounded-tr-xl" : i === 3 ? "rounded-br-xl" : "";
            return (
              <button
                key={img.url + index}
                type="button"
                onClick={() => openAt(index)}
                aria-label={t("openPhoto", { n: index + 1 })}
                className={`relative overflow-hidden bg-kiwi-50 transition hover:opacity-95 ${rounding}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.caption || ""}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </button>
            );
          })}
        </div>

        {hasMoreOverlay && (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full border border-kiwi-900/20 bg-white px-3 py-1.5 text-sm font-medium text-kiwi-900 shadow hover:bg-kiwi-50"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-4 w-4"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            {t("showAll", { count: images.length })}
          </button>
        )}
      </div>

      {lightboxOpen && (
        <PhotoLightbox
          images={images}
          alt={alt}
          initialIndex={lightboxStart}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}
