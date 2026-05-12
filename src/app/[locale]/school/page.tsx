import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PropertyCard } from "@/components/PropertyCard";
import { getHostawayClient, type HostawayListing } from "@/lib/hostaway";

export default async function SchoolPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const listing = await getHostawayClient().getListing();
  return <SchoolJourney listing={listing} />;
}

function SchoolJourney({ listing }: { listing: HostawayListing }) {
  const t = useTranslations("School");
  const common = useTranslations("Common");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-semibold text-kiwi-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base text-kiwi-700">{t("intro")}</p>
      </header>

      <ul className="mx-auto mt-10 grid max-w-3xl gap-3 text-sm text-kiwi-800">
        <li className="rounded-xl border border-kiwi-100 bg-white p-4">
          {t("features.drillDown")}
        </li>
        <li className="rounded-xl border border-kiwi-100 bg-white p-4">
          {t("features.seasonal")}
        </li>
        <li className="rounded-xl border border-kiwi-100 bg-white p-4">
          {t("features.tour")}
        </li>
      </ul>

      <div className="mx-auto mt-6 flex max-w-3xl items-center justify-center">
        <span className="rounded-full bg-kiwi-100 px-3 py-1 text-xs font-medium text-kiwi-700">
          {common("comingSoon")}
        </span>
      </div>

      <section className="mt-12">
        <PropertyCard listing={listing} />
      </section>
    </div>
  );
}
