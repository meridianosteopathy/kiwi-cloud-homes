import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PropertyList } from "@/components/PropertyList";
import { SchoolMatch } from "@/components/SchoolMatch";
import { SchoolSearch } from "@/components/SchoolSearch";
import { SeasonalGuide } from "@/components/SeasonalGuide";
import { homeSummary, type HomeSummary } from "@/content/homes";
import { defaultDatesForMonth } from "@/lib/dates";
import { getHostawayClient, type HostawayListing } from "@/lib/hostaway";
import { distanceFrom, findSchool, type School } from "@/lib/schools";
import { findSeason, type SeasonId } from "@/lib/seasons";

// Listing/price/availability are live data — render per request so the page
// reflects the current Hostaway state and the build never blocks on the API.
export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function pickString(sp: SearchParams, key: string): string | null {
  const v = sp[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

/**
 * Puts the home closest to the chosen school first, so a guest comparing
 * houses for a specific school sees the most relevant one at the top.
 * Homes we can't measure keep their configured order, after the rest.
 */
function orderByDistanceToSchool(
  listings: HostawayListing[],
  schoolId: string | null,
): HostawayListing[] {
  const school = schoolId ? findSchool(schoolId) : undefined;
  if (!school) return listings;

  return [...listings].sort((a, b) => {
    const da = distanceToSchool(a, school);
    const db = distanceToSchool(b, school);
    if (da === null && db === null) return 0;
    if (da === null) return 1;
    if (db === null) return -1;
    return da - db;
  });
}

function distanceToSchool(
  listing: HostawayListing,
  school: School,
): number | null {
  const coordinates = homeSummary(listing).coordinates;
  if (!coordinates) return null;
  return distanceFrom(school, coordinates)?.distanceKm ?? null;
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
  const listings = await getHostawayClient().listListings();
  const inquiryEmail = process.env.INQUIRY_EMAIL || null;

  return (
    <SchoolJourney
      listings={orderByDistanceToSchool(listings, schoolId)}
      homes={listings.map(homeSummary)}
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
  listings,
  homes,
  schoolId,
  seasonId,
  month,
  defaultCheckIn,
  defaultCheckOut,
  inquiryEmail,
}: {
  listings: HostawayListing[];
  homes: HomeSummary[];
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
        <h1 className="font-display text-3xl font-bold text-kiwi-900 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base text-kiwi-700">{t("intro")}</p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <SchoolSearch selectedSchoolId={schoolId} homes={homes} />
        <SeasonalGuide selectedSeasonId={seasonId} selectedMonth={month} />
      </div>

      <div className="mt-5">
        <SchoolMatch schoolId={schoolId} homes={homes} />
      </div>

      <div className="mt-10">
        <PropertyList
          listings={listings}
          inquiryEmail={inquiryEmail}
          defaultCheckIn={defaultCheckIn}
          defaultCheckOut={defaultCheckOut}
        />
      </div>
    </div>
  );
}
