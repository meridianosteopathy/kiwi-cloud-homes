import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { DirectBookingBanner } from "@/components/DirectBookingBanner";
import { PropertyList } from "@/components/PropertyList";
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

  const client = getHostawayClient();
  const listings = await client.listListings();
  const inquiryEmail = process.env.INQUIRY_EMAIL || null;
  return (
    <TouristJourney
      listings={listings}
      inquiryEmail={inquiryEmail}
      directBooking={client.capabilities.directBooking}
    />
  );
}

function TouristJourney({
  listings,
  inquiryEmail,
  directBooking,
}: {
  listings: HostawayListing[];
  inquiryEmail: string | null;
  directBooking: boolean;
}) {
  const t = useTranslations("Tourist");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="font-display text-3xl font-bold text-kiwi-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base text-kiwi-700">{t("intro")}</p>
      </header>

      <div className="mx-auto mt-10 max-w-3xl">
        <DirectBookingBanner directBooking={directBooking} />
      </div>

      <ul className="mx-auto mt-6 grid max-w-3xl gap-3 text-sm text-kiwi-800">
        <li className="rounded-xl border border-kiwi-100 bg-white p-4">
          {t(directBooking ? "features.dates" : "features.datesInquiry")}
        </li>
        <li className="rounded-xl border border-kiwi-100 bg-white p-4">
          {t(directBooking ? "features.inquiry" : "features.inquiryOnly")}
        </li>
      </ul>

      <div className="mt-12">
        <PropertyList listings={listings} inquiryEmail={inquiryEmail} />
      </div>
    </div>
  );
}
