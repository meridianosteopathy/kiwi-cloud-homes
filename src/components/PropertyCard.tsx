import { useFormatter, useTranslations } from "next-intl";
import type { HostawayListing } from "@/lib/hostaway";

type Props = {
  listing: HostawayListing;
};

export function PropertyCard({ listing }: Props) {
  const t = useTranslations("Property");
  const format = useFormatter();

  const priceLabel = format.number(listing.basePrice.amount, {
    style: "currency",
    currency: listing.basePrice.currency,
    maximumFractionDigits: 0,
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-kiwi-200 bg-white shadow-sm">
      <div className="relative aspect-[16/9] w-full bg-gradient-to-br from-kiwi-200 via-kiwi-100 to-kiwi-50">
        <div className="absolute inset-0 flex items-center justify-center text-sm text-kiwi-600">
          360°
        </div>
      </div>

      <div className="space-y-3 p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-kiwi-900">
              {listing.name}
            </h3>
            <p className="text-sm text-kiwi-700">
              {listing.address.city}, {listing.address.region}
            </p>
          </div>
          <div className="text-right">
            <div className="text-base font-semibold text-kiwi-900">
              {priceLabel}
            </div>
            <div className="text-xs text-kiwi-600">{t("perNight")}</div>
          </div>
        </header>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-kiwi-700">
          <li>{t("bedrooms", { count: listing.bedrooms })}</li>
          <li>{t("bathrooms", { count: listing.bathrooms })}</li>
          <li>{t("maxGuests", { count: listing.maxGuests })}</li>
        </ul>

        <p className="text-sm leading-relaxed text-kiwi-800">
          {listing.description}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            className="rounded-full bg-kiwi-600 px-4 py-2 text-sm font-medium text-white hover:bg-kiwi-700"
          >
            {t("bookNow")}
          </button>
          <button
            type="button"
            className="rounded-full border border-kiwi-300 px-4 py-2 text-sm font-medium text-kiwi-800 hover:bg-kiwi-50"
          >
            {t("inquire")}
          </button>
        </div>
      </div>
    </article>
  );
}
