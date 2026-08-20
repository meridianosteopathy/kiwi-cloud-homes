"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ListingImage } from "@/lib/hostaway";
import { organizeImages, type ImageCategory } from "@/lib/photos";

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
  // Keyed by each photo's index in `images` — grouping reorders the page, so
  // an index into the rendered order would scroll to the wrong photo.
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  const { grouped, sections } = useMemo(() => organizeImages(images), [images]);

  // Load the first few photos on the page eagerly, plus the one we open at —
  // after grouping those are rarely the same photos.
  const eager = useMemo(() => {
    const first = sections.flatMap((s) => s.items.map((i) => i.index)).slice(0, 3);
    return new Set([...first, initialIndex]);
  }, [sections, initialIndex]);

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

        {grouped && (
          <nav
            aria-label={t("categories")}
            className="flex gap-2 overflow-x-auto border-t border-kiwi-50 px-4 py-2 sm:px-6"
          >
            {sections.map(({ category, items }) => (
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
          {sections.map(({ category, items }) => (
            <section
              key={category}
              ref={(el) => {
                sectionRefs.current[category] = el;
              }}
              className="mb-8 scroll-mt-32"
            >
              {grouped && (
                <h3 className="mb-3 flex items-baseline gap-2 text-lg font-semibold text-kiwi-900">
                  <span>{t(`category.${category}`)}</span>
                  <span className="text-sm font-normal text-kiwi-600">
                    {items.length}
                  </span>
                </h3>
              )}

              <div className="space-y-3">
                {items.map(({ image: img, index }) => (
                  <figure
                    key={img.url + index}
                    ref={(el) => {
                      itemRefs.current[index] = el;
                    }}
                    className="scroll-mt-28 overflow-hidden rounded-xl bg-kiwi-50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.caption || `${alt} — ${index + 1}`}
                      loading={eager.has(index) ? "eager" : "lazy"}
                      className="w-full object-cover"
                    />
                    {img.caption && (
                      <figcaption className="px-3 py-2 text-xs text-kiwi-700">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
