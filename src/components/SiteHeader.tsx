import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LanguageToggle } from "./LanguageToggle";

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="border-b border-kiwi-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-base font-semibold text-kiwi-800">
            {t("Site.name")}
          </span>
          <span className="text-xs text-kiwi-600">{t("Site.tagline")}</span>
        </Link>

        <nav className="hidden items-center gap-5 text-sm text-kiwi-800 md:flex">
          <Link href="/" className="hover:text-kiwi-600">
            {t("Nav.home")}
          </Link>
          <Link href="/tourist" className="hover:text-kiwi-600">
            {t("Nav.tourist")}
          </Link>
          <Link href="/school" className="hover:text-kiwi-600">
            {t("Nav.school")}
          </Link>
        </nav>

        <LanguageToggle />
      </div>
    </header>
  );
}
