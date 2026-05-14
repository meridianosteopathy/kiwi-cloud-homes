import { useLocale } from "next-intl";
import { Link } from "@/i18n/routing";

/**
 * Prominent language selector at the top of the landing page. Bilingual prompt
 * stays readable regardless of the currently-active locale (since the visitor
 * may have arrived in the "wrong" one). Server-rendered links so the choice
 * works even without JS — the next-intl middleware sets NEXT_LOCALE and
 * rewrites to the right locale segment.
 */
export function LanguageHero() {
  const locale = useLocale();

  return (
    <section className="border-b border-kiwi-100 bg-white py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kiwi-600">
          Step 1 · 第一步
        </p>
        <h2 className="mt-2 text-xl font-semibold text-kiwi-900 sm:text-2xl">
          请选择您的语言 / Choose your language
        </h2>

        <div className="mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          <LanguageCard
            href="/"
            switchLocale="zh-CN"
            active={locale === "zh-CN"}
            label="中文"
            sub="简体中文"
            flag="🇨🇳"
          />
          <LanguageCard
            href="/"
            switchLocale="en"
            active={locale === "en"}
            label="English"
            sub="New Zealand English"
            flag="🇳🇿"
          />
        </div>
      </div>
    </section>
  );
}

function LanguageCard({
  href,
  switchLocale,
  active,
  label,
  sub,
  flag,
}: {
  href: "/";
  switchLocale: "zh-CN" | "en";
  active: boolean;
  label: string;
  sub: string;
  flag: string;
}) {
  return (
    <Link
      href={href}
      locale={switchLocale}
      aria-current={active ? "true" : undefined}
      className={
        "flex flex-col items-center rounded-2xl border-2 px-6 py-6 transition " +
        (active
          ? "border-kiwi-600 bg-kiwi-50 shadow-sm"
          : "border-kiwi-200 bg-white hover:-translate-y-0.5 hover:border-kiwi-400 hover:shadow-md")
      }
    >
      <span className="text-xl font-semibold text-kiwi-900">{label}</span>
      <span className="mt-1 text-xs text-kiwi-600">{sub}</span>
      <span aria-hidden className="mt-3 text-5xl leading-none">
        {flag}
      </span>
      {active && (
        <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-kiwi-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
          ✓ 当前 · current
        </span>
      )}
    </Link>
  );
}
