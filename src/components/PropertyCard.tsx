import { useLocale, useTranslations } from "next-intl";
import { resolveDescription, resolveTourUrl } from "@/content/listing-content";
import type { HostawayListing } from "@/lib/hostaway";
import { BookingForm } from "./BookingForm";
import { PropertyAmenities } from "./PropertyAmenities";
import { PropertyImages } from "./PropertyImages";

type Props = {
  listing: HostawayListing;
  inquiryEmail: string | null;
  defaultCheckIn?: string | null;
  defaultCheckOut?: string | null;
};

export function PropertyCard({
  listing,
  inquiryEmail,
  defaultCheckIn = null,
  defaultCheckOut = null,
}: Props) {
  const t = useTranslations("Property");
  const locale = useLocale();
  const description = resolveDescription(locale, listing.description);
  const tourUrl = resolveTourUrl(listing.tourUrl);

  return (
    <article className="overflow-hidden rounded-2xl border border-kiwi-200 bg-white shadow-sm">
      <div className="p-5">
        <PropertyImages
          images={listing.images}
          alt={listing.name}
          tourUrl={tourUrl}
          listingName={listing.name}
        />
      </div>

      <div className="grid gap-5 px-5 pb-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <header>
            <h3 className="text-xl font-semibold text-kiwi-900">
              {listing.name}
            </h3>
            <p className="text-sm text-kiwi-700">
              {[listing.address.city, listing.address.region]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </header>

          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-kiwi-700">
            <li>{t("bedrooms", { count: listing.bedrooms })}</li>
            <li>{t("bathrooms", { count: listing.bathrooms })}</li>
            <li>{t("maxGuests", { count: listing.maxGuests })}</li>
          </ul>

          {description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-kiwi-800">
              {description}
            </p>
          )}
        </div>

        <BookingForm
          listingId={listing.id}
          listingName={listing.name}
          basePrice={listing.basePrice}
          maxGuests={listing.maxGuests}
          inquiryEmail={inquiryEmail}
          defaultCheckIn={defaultCheckIn}
          defaultCheckOut={defaultCheckOut}
        />
      </div>

      <PropertyAmenities amenities={listing.amenities} />
    </article>
  );
}
