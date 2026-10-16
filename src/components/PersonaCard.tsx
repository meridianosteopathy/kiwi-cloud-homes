import { Link } from "@/i18n/routing";
import type { ReactNode } from "react";

type Props = {
  href?: string;
  title: string;
  blurb: string;
  cta?: string;
  badge?: string;
  disabled?: boolean;
  icon?: ReactNode;
};

/**
 * One of the two choices on the landing page. The whole card is the link,
 * but the CTA is styled as a solid pill so the card reads as something you
 * tap rather than a block of text — on a phone the button is often the only
 * affordance a visitor registers.
 */
export function PersonaCard({
  href,
  title,
  blurb,
  cta,
  badge,
  disabled,
  icon,
}: Props) {
  const body = (
    <div
      className={
        "group relative flex h-full flex-col items-center rounded-2xl border bg-white p-6 text-center shadow-sm transition sm:p-8 " +
        (disabled
          ? "border-kiwi-100 opacity-70"
          : "border-kiwi-200 hover:-translate-y-0.5 hover:border-kiwi-400 hover:shadow-lg")
      }
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-kiwi-100 px-2 py-0.5 text-[11px] font-medium text-kiwi-700">
          {badge}
        </span>
      )}
      {icon && (
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-kiwi-50 text-kiwi-600">
          {icon}
        </div>
      )}
      <h2 className="font-display text-xl font-bold text-kiwi-900">{title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-kiwi-700">
        {blurb}
      </p>
      {cta && (
        <span
          className={
            "mt-6 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors " +
            (disabled
              ? "bg-kiwi-100 text-kiwi-400"
              : "bg-kiwi-600 text-white group-hover:bg-kiwi-700")
          }
        >
          {cta}
          {!disabled && <span aria-hidden>→</span>}
        </span>
      )}
    </div>
  );

  if (disabled || !href) {
    return (
      <div aria-disabled={disabled} className="h-full">
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="h-full rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kiwi-600"
    >
      {body}
    </Link>
  );
}
