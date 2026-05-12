import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-kiwi-100 bg-kiwi-50/50">
      <div className="mx-auto max-w-6xl px-4 py-6 text-center text-xs text-kiwi-700">
        {t("rights", { year })}
      </div>
    </footer>
  );
}
