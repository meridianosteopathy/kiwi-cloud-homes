import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PropertyCard } from "@/components/PropertyCard";
import { SchoolMatch } from "@/components/SchoolMatch";
import { SchoolSearch } from "@/components/SchoolSearch";
import { SeasonalGuide } from "@/components/SeasonalGuide";
import { defaultDatesForMonth } from "@/lib/dates";
import { getHostawayClient, type HostawayListing } from "@/lib/hostaway";
import { findSchool } from "@/lib/schools";
import { findSeason, type SeasonId } from "@/lib/seasons";

type SearchParams = Record<string, string | string[] | undefined>;

function pickString(sp: SearchParams, key: string): string | null {
  const v = sp[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export default async function SchoolPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const sp = await searchParams;
  const schoolIdRaw = pickString(sp, "school");
  const seasonRaw = pickString(sp, "season");
  const monthRaw = pickString(sp, "month");

  const schoolId = schoolIdRaw && findSchool(schoolIdRaw) ? schoolIdRaw : null;
  const seasonId: SeasonId | null = seasonRaw
    ? (findSeason(seasonRaw)?.id ?? null)
    : null;
  const monthNum = monthRaw ? Number(monthRaw) : null;
  const month =
    monthNum && Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12
      ? monthNum
      : null;

  const { checkIn, checkOut } = defaultDatesForMonth(month);
  const listing = await getHostawayClient().getListing();
  const inquiryEmail = process.env.INQUIRY_EMAIL || null;

  return (
    <SchoolJourney
      listing={listing}
      schoolId={schoolId}
      seasonId={seasonId}
      month={month}
      defaultCheckIn={checkIn}
      defaultCheckOut={checkOut}
      inquiryEmail={inquiryEmail}
    />
  );
}

function SchoolJourney({
  listing,
  schoolId,
  seasonId,
  month,
  defaultCheckIn,
  defaultCheckOut,
  inquiryEmail,
}: {
  listing: HostawayListing;
  schoolId: string | null;
  seasonId: SeasonId | null;
  month: number | null;
  defaultCheckIn: string | null;
  defaultCheckOut: string | null;
  inquiryEmail: string | null;
}) {
  const t = useTranslations("School");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <header className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-semibold text-kiwi-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base text-kiwi-700">{t("intro")}</p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <SchoolSearch selectedSchoolId={schoolId} />
        <SeasonalGuide selectedSeasonId={seasonId} selectedMonth={month} />
      </div>

      <div className="mt-5">
        <SchoolMatch schoolId={schoolId} />
      </div>

      <section className="mt-10">
        <PropertyCard
          listing={listing}
          inquiryEmail={inquiryEmail}
          defaultCheckIn={defaultCheckIn}
          defaultCheckOut={defaultCheckOut}
        />
      </section>
    </div>
  );
}

