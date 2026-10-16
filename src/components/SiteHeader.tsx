import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LanguageToggle } from "./LanguageToggle";
import { BrandLockup } from "./BrandLogo";

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="border-b border-kiwi-100 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label={t("Site.name")}>
          {/* Both wordmark and tagline drop out as the header narrows: the
              tagline wraps to two lines on a phone, and below 360px the name
              itself can't share the row with the language toggle without
              wrapping. The mark alone carries the brand there, and the link
              keeps its aria-label. */}
          <BrandLockup
            name={t("Site.name")}
            tagline={t("Site.tagline")}
            nameClassName="hidden min-[360px]:block"
            taglineClassName="hidden sm:block"
          />
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
