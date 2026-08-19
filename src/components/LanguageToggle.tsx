"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, routing } from "@/i18n/routing";

export function LanguageToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LanguageToggle");
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-kiwi-200 bg-white p-1 text-sm shadow-sm"
      role="group"
      aria-label={t("label")}
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => {
              if (active || isPending) return;
              startTransition(() => {
                router.replace(pathname, { locale: code });
              });
            }}
            aria-pressed={active}
            className={
              // py-2 keeps the pill a comfortable tap target on a phone; the
              // header toggle is the site's only language switch. nowrap stops
              // "中文" breaking into two stacked glyphs on a narrow screen.
              "whitespace-nowrap rounded-full px-3 py-2 transition-colors " +
              (active
                ? "bg-kiwi-600 text-white"
                : "text-kiwi-800 hover:bg-kiwi-50")
            }
          >
            {t(code)}
          </button>
        );
      })}
    </div>
  );
}
