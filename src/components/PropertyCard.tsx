import { useLocale, useTranslations } from "next-intl";
import {
  homeCoordinates,
  resolveBedroomsLabel,
  resolveDescription,
  resolveTourUrl,
  type HomeListing,
} from "@/content/homes";
import { nearestSupermarket } from "@/lib/supermarkets";
import { BookingForm } from "./BookingForm";
import { PropertyAmenities } from "./PropertyAmenities";
import { PropertyImages } from "./PropertyImages";

type Props = {
  listing: HomeListing;
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
  const description = resolveDescription(listing, locale, listing.description);
  const tourUrl = resolveTourUrl(listing);
  const bedroomsLabel = resolveBedroomsLabel(listing, locale);
  const coordinates = homeCoordinates(listing);
  const supermarket = coordinates ? nearestSupermarket(coordinates) : null;

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
            <li>{bedroomsLabel ?? t("bedrooms", { count: listing.bedrooms })}</li>
            {listing.bathrooms !== null && (
              <li>{t("bathrooms", { count: listing.bathrooms })}</li>
            )}
            {listing.maxGuests !== null && (
              <li>{t("maxGuests", { count: listing.maxGuests })}</li>
            )}
          </ul>

          {supermarket && (
            <p className="text-sm text-kiwi-700">
              {t("nearestSupermarket", {
                name:
                  locale === "zh-CN"
                    ? (supermarket.nameZh ?? supermarket.name)
                    : supermarket.name,
                minutes: supermarket.drivingMinutes,
              })}
            </p>
          )}

          {description && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-kiwi-800">
              {description}
            </p>
          )}
        </div>

        <BookingForm
          listingId={listing.id}
          listingName={listing.name}
          maxGuests={listing.maxGuests}
          minNights={listing.minNights}
          inquiryEmail={inquiryEmail}
          defaultCheckIn={defaultCheckIn}
          defaultCheckOut={defaultCheckOut}
        />
      </div>

      <PropertyAmenities amenities={listing.amenities} />
    </article>
  );
}
