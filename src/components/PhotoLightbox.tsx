"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";

type Props = {
  images: string[];
  alt: string;
  /** Optional scroll target on open. */
  initialIndex?: number;
  onClose: () => void;
};

export function PhotoLightbox({ images, alt, initialIndex = 0, onClose }: Props) {
  const t = useTranslations("PropertyImages");
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    closeBtnRef.current?.focus();
    const target = itemRefs.current[initialIndex];
    if (target) {
      target.scrollIntoView({ block: "start" });
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);

    // Lock body scroll while the lightbox is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [initialIndex, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-white"
    >
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-kiwi-100 bg-white px-4 py-3 sm:px-6">
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
      </header>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl space-y-3 px-4 py-6 sm:px-6">
          {images.map((url, i) => (
            <figure
              key={url + i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              className="overflow-hidden rounded-xl bg-kiwi-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${alt} — ${i + 1}`}
                loading={i < 3 ? "eager" : "lazy"}
                className="w-full object-cover"
              />
              <figcaption className="px-3 py-2 text-xs text-kiwi-600">
                {t("photoIndex", { n: i + 1, total: images.length })}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
