"use client";

import { useEffect, useId, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ResolvedAmenity } from "@/lib/amenities";

type Props = {
  amenities: ResolvedAmenity[];
  onClose: () => void;
};

export function AmenitiesModal({ amenities, onClose }: Props) {
  const t = useTranslations("Amenities");
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
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
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
    >
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
        <header className="sticky top-0 flex items-center justify-between border-b border-kiwi-100 bg-white px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-kiwi-900">
            {t("modalTitle")}
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className="rounded-full p-1 text-kiwi-600 hover:bg-kiwi-50 hover:text-kiwi-900"
          >
            <span aria-hidden className="text-xl leading-none">×</span>
          </button>
        </header>

        <ul className="divide-y divide-kiwi-100 px-5 py-2">
          {amenities.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3 text-sm text-kiwi-800">
              <span aria-hidden className="text-lg leading-none">
                {a.icon}
              </span>
              <span>{a.label}</span>
            </li>
          ))}
        </ul>

        <footer className="sticky bottom-0 flex justify-end border-t border-kiwi-100 bg-white px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700"
          >
            {t("close")}
          </button>
        </footer>
      </div>
    </div>
  );
}
