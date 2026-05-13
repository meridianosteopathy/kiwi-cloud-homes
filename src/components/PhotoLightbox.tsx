"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ListingImage } from "@/lib/hostaway";
import { groupImagesByCategory, type ImageCategory } from "@/lib/photos";

type Props = {
  images: ListingImage[];
  alt: string;
  /** Optional scroll target on open. */
  initialIndex?: number;
  onClose: () => void;
};

export function PhotoLightbox({ images, alt, initialIndex = 0, onClose }: Props) {
  const t = useTranslations("PropertyImages");
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const sectionRefs = useRef<Record<ImageCategory, HTMLElement | null>>(
    {} as Record<ImageCategory, HTMLElement | null>,
  );
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  const grouped = useMemo(() => groupImagesByCategory(images), [images]);
  const hasCategories = grouped.length > 1;

  useEffect(() => {
    closeBtnRef.current?.focus();
    const target = itemRefs.current[initialIndex];
    if (target) target.scrollIntoView({ block: "start" });

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [initialIndex, onClose]);

  function scrollToCategory(c: ImageCategory) {
    const el = sectionRefs.current[c];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Flat index for itemRefs so the scroll-to-clicked-photo logic still works.
  let flatIdx = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-white"
    >
      <header className="sticky top-0 z-20 border-b border-kiwi-100 bg-white">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-kiwi-900 hover:bg-kiwi-50"
          >
            <span aria-hidden className="text-lg leading-none">←</span>
            <span>{t("backToListing")}</span>
          </button>
          <h2 id={titleId} className="text-sm font-medium text-kiwi-700">
            {t("photoCount", { count: images.length })}
          </h2>
          <div className="w-24" />
        </div>

        {hasCategories && (
          <nav
            aria-label={t("categories")}
            className="flex gap-2 overflow-x-auto border-t border-kiwi-50 px-4 py-2 sm:px-6"
          >
            {grouped.map(({ category, items }) => (
              <button
                key={category}
                type="button"
                onClick={() => scrollToCategory(category)}
                className="shrink-0 rounded-full border border-kiwi-200 px-3 py-1 text-xs font-medium text-kiwi-800 hover:border-kiwi-400 hover:bg-kiwi-50"
              >
                {t(`category.${category}`)}{" "}
                <span className="text-kiwi-500">· {items.length}</span>
              </button>
            ))}
          </nav>
        )}
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          {grouped.map(({ category, items }) => (
            <section
              key={category}
              ref={(el) => {
                sectionRefs.current[category] = el;
              }}
              className="mb-8 scroll-mt-32"
            >
              {hasCategories && (
                <h3 className="mb-3 flex items-baseline gap-2 text-lg font-semibold text-kiwi-900">
                  <span>{t(`category.${category}`)}</span>
                  <span className="text-sm font-normal text-kiwi-600">
                    {items.length}
                  </span>
                </h3>
              )}

              <div className="space-y-3">
                {items.map((img) => {
                  flatIdx += 1;
                  const myIndex = flatIdx;
                  return (
                    <figure
                      key={img.url + myIndex}
                      ref={(el) => {
                        itemRefs.current[myIndex] = el;
                      }}
                      className="overflow-hidden rounded-xl bg-kiwi-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.caption || `${alt} — ${myIndex + 1}`}
                        loading={myIndex < 3 ? "eager" : "lazy"}
                        className="w-full object-cover"
                      />
                      {img.caption && (
                        <figcaption className="px-3 py-2 text-xs text-kiwi-700">
                          {img.caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
