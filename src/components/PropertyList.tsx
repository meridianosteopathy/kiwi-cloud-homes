import { useTranslations } from "next-intl";
import type { HostawayListing } from "@/lib/hostaway";
import { PropertyCard } from "./PropertyCard";

type Props = {
  listings: HostawayListing[];
  inquiryEmail: string | null;
  defaultCheckIn?: string | null;
  defaultCheckOut?: string | null;
};

/** Anchor id for a home, so the jump links can reach its card. */
function anchorFor(listingId: string): string {
  return `home-${listingId}`;
}

/**
 * The site's homes, one bookable card each. A single home renders exactly as
 * it always did — the heading and jump links only appear once there's more
 * than one, where a guest needs to tell them apart.
 */
export function PropertyList({
  listings,
  inquiryEmail,
  defaultCheckIn = null,
  defaultCheckOut = null,
}: Props) {
  const t = useTranslations("Homes");

  if (listings.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-kiwi-200 bg-white p-8 text-center text-sm text-kiwi-600">
        {t("none")}
      </section>
    );
  }

  const multiple = listings.length > 1;

  return (
    <div className="space-y-8">
      {multiple && (
        <header>
          <h2 className="text-xl font-semibold text-kiwi-900">
            {t("title", { count: listings.length })}
          </h2>
          <p className="mt-1 text-sm text-kiwi-700">{t("subtitle")}</p>
          <nav aria-label={t("jumpLabel")} className="mt-3 flex flex-wrap gap-2">
            {listings.map((listing) => (
              <a
                key={listing.id}
                href={`#${anchorFor(listing.id)}`}
                // py-2.5 keeps these jump links a comfortable tap target on a
                // phone; at py-1 they were 26px tall.
                className="rounded-full border border-kiwi-200 px-3.5 py-2.5 text-xs font-medium text-kiwi-700 transition hover:bg-kiwi-50"
              >
                {listing.name}
              </a>
            ))}
          </nav>
        </header>
      )}

      {listings.map((listing) => (
        <section key={listing.id} id={anchorFor(listing.id)} className="scroll-mt-24">
          <PropertyCard
            listing={listing}
            inquiryEmail={inquiryEmail}
            defaultCheckIn={defaultCheckIn}
            defaultCheckOut={defaultCheckOut}
          />
        </section>
      ))}
    </div>
  );
}
