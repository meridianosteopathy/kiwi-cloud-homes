import { useTranslations } from "next-intl";
import { BrandLockup, BrandStrapline } from "./BrandLogo";

export function SiteFooter() {
  const t = useTranslations("Footer");
  const tSite = useTranslations("Site");
  const year = new Date().getFullYear();

  return (
    // Navy footer mirrors the brand's `icon-on-navy` treatment and gives the
    // page a deliberate close rather than fading out into a tinted strip.
    <footer className="mt-auto bg-brand-navy">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-10 text-center">
        <BrandLockup
          name={tSite("name")}
          tagline={tSite("tagline")}
          variant="reversed"
          stacked
        />
        <BrandStrapline reversed />
        <p className="mt-2 text-xs text-brand-cloud">{t("rights", { year })}</p>
      </div>
    </footer>
  );
}
