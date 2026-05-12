import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PropertyCard } from "@/components/PropertyCard";
import { getHostawayClient, type HostawayListing } from "@/lib/hostaway";

// Listing/price/availability are live data — render per request so the page
// reflects the current Hostaway state and the build never blocks on the API.
export const dynamic = "force-dynamic";

export default async function TouristPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const listing = await getHostawayClient().getListing();
  const inquiryEmail = process.env.INQUIRY_EMAIL || null;
  return <TouristJourney listing={listing} inquiryEmail={inquiryEmail} />;
}

function TouristJourney({
  listing,
  inquiryEmail,
}: {
  listing: HostawayListing;
  inquiryEmail: string | null;
}) {
  const t = useTranslations("Tourist");

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
          {t("features.dates")}
        </li>
        <li className="rounded-xl border border-kiwi-100 bg-white p-4">
          {t("features.tour")}
        </li>
        <li className="rounded-xl border border-kiwi-100 bg-white p-4">
          {t("features.inquiry")}
        </li>
      </ul>

      <section className="mt-12">
        <PropertyCard listing={listing} inquiryEmail={inquiryEmail} />
      </section>
    </div>
  );
}
