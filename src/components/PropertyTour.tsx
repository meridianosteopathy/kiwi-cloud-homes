"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  detectTourProvider,
  normaliseTourUrl,
  tourIframeAllow,
} from "@/lib/tour";

type Props = {
  tourUrl: string;
  listingName: string;
  onClose: () => void;
};

export function PropertyTour({ tourUrl, listingName, onClose }: Props) {
  const t = useTranslations("Tour");
  const titleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const { src, allow, provider } = useMemo(() => {
    const src = normaliseTourUrl(tourUrl);
    const provider = detectTourProvider(src);
    return { src, allow: tourIframeAllow(provider), provider };
  }, [tourUrl]);

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

  const providerLabel =
    provider === "matterport"
      ? "Matterport"
      : provider === "kuula"
        ? "Kuula"
        : provider === "youtube"
          ? "YouTube"
          : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex flex-col bg-kiwi-900/95"
    >
      <header className="flex items-center justify-between border-b border-kiwi-700 bg-kiwi-900 px-4 py-3 sm:px-6">
        <button
          ref={closeBtnRef}
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white hover:bg-white/10"
        >
          <span aria-hidden className="text-lg leading-none">←</span>
          <span>{t("backToListing")}</span>
        </button>
        <h2 id={titleId} className="truncate text-sm font-medium text-white">
          {t("title")} · {listingName}
        </h2>
        <div className="w-24 text-right text-[11px] text-white/60">
          {providerLabel}
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center bg-black">
        <iframe
          src={src}
          title={t("iframeTitle", { listing: listingName })}
          allow={allow}
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    </div>
  );
}
