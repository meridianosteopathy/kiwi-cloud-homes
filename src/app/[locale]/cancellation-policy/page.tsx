import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export const dynamic = "force-static";

// The date the current policy took effect. Bump when policy text changes.
const EFFECTIVE_FROM = "2026-06-05";

export default async function CancellationPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PolicyBody locale={locale} />;
}

function PolicyBody({ locale }: { locale: string }) {
  const t = useTranslations("CancellationPolicy");
  const effective = new Date(EFFECTIVE_FROM + "T00:00:00Z").toLocaleDateString(
    locale === "zh-CN" ? "zh-CN" : "en-NZ",
    { year: "numeric", month: "long", day: "numeric" },
  );

  const shortStayKeys = [
    "fullRefund",
    "halfRefund",
    "cleaningRefund",
    "afterCheckin",
    "howTo",
  ] as const;
  const longStayKeys = [
    "adminFee",
    "beforeCutoff",
    "afterCutoff",
    "midStay",
    "howTo",
  ] as const;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-12">
      <header>
        <h1 className="text-3xl font-semibold text-kiwi-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-kiwi-700">{t("intro")}</p>
        <p className="mt-1 text-xs text-kiwi-600">
          {t("asOf", { date: effective })}
        </p>
      </header>

      <section className="mt-10 rounded-2xl border border-kiwi-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-kiwi-900">
          {t("shortStay.heading")}
        </h2>
        <p className="mt-2 text-sm text-kiwi-700">{t("shortStay.summary")}</p>
        <ul className="mt-4 space-y-2 text-sm text-kiwi-800">
          {shortStayKeys.map((k) => (
            <li key={k} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kiwi-600" />
              <span>{t(`shortStay.points.${k}`)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-kiwi-600">
          {t("shortStay.refundTiming")}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-kiwi-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-kiwi-900">
          {t("longStay.heading")}
        </h2>
        <p className="mt-2 text-sm text-kiwi-700">{t("longStay.summary")}</p>
        <ul className="mt-4 space-y-2 text-sm text-kiwi-800">
          {longStayKeys.map((k) => (
            <li key={k} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-kiwi-600" />
              <span>{t(`longStay.points.${k}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm text-kiwi-700">{t("questions")}</p>
    </div>
  );
}
