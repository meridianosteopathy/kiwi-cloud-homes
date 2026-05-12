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
        "group relative flex h-full flex-col rounded-2xl border bg-white p-6 shadow-sm transition " +
        (disabled
          ? "border-kiwi-100 opacity-70"
          : "border-kiwi-200 hover:-translate-y-0.5 hover:border-kiwi-400 hover:shadow-md")
      }
    >
      {badge && (
        <span className="absolute right-4 top-4 rounded-full bg-kiwi-100 px-2 py-0.5 text-[11px] font-medium text-kiwi-700">
          {badge}
        </span>
      )}
      {icon && (
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-kiwi-50 text-kiwi-700">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-kiwi-900">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-kiwi-700">
        {blurb}
      </p>
      {cta && (
        <span
          className={
            "mt-5 inline-flex items-center gap-1 text-sm font-medium " +
            (disabled
              ? "text-kiwi-400"
              : "text-kiwi-600 group-hover:text-kiwi-800")
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
    <Link href={href} className="h-full">
      {body}
    </Link>
  );
}
