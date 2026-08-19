/**
 * Kiwi Cloud Homes logo, inlined from the supplied brand SVGs so it can be
 * recoloured per surface without shipping five near-identical files.
 *
 * The artwork is a cloud over a house outline with a kiwi bird tucked
 * inside. Geometry matches `public/brand/*.svg` exactly (120×120 viewBox) —
 * only the fills change between variants:
 *
 *   primary   — full colour, for light surfaces
 *   reversed  — solid white with a sky-blue eye, for navy/photo surfaces
 *   mono      — single-colour navy, for print / low-ink contexts
 */

type MarkVariant = "primary" | "reversed" | "mono";

const PALETTE: Record<
  MarkVariant,
  { cloud: string; house: string; bird: string; eye: string }
> = {
  primary: {
    cloud: "#a9cfea",
    house: "#2c6e9e",
    bird: "#4a9bd4",
    eye: "#ffffff",
  },
  reversed: {
    cloud: "#ffffff",
    house: "#ffffff",
    bird: "#ffffff",
    eye: "#4a9bd4",
  },
  mono: {
    cloud: "#1e4e79",
    house: "#1e4e79",
    bird: "#1e4e79",
    eye: "#ffffff",
  },
};

export function BrandMark({
  variant = "primary",
  className = "h-10 w-10",
}: {
  variant?: MarkVariant;
  className?: string;
}) {
  const c = PALETTE[variant];

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      {/* cloud */}
      <g fill={c.cloud}>
        <circle cx="19" cy="29" r="6" />
        <circle cx="27" cy="24" r="8" />
        <circle cx="35" cy="29" r="6" />
        <rect x="13" y="27" width="28" height="8" rx="4" />
      </g>
      {/* house */}
      <path
        d="M30,98 V60 L60,38 L90,60 V98"
        fill="none"
        stroke={c.house}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* kiwi */}
      <path
        d="M40,79 C40,68 48,61 57,61 C62,61 65,63 66.5,66 L77,70 L66.5,71.5 C67.5,76 67,81 64.5,85 C61.5,90 56,92.5 51,92.5 C44.5,92.5 40,88 40,79 Z"
        fill={c.bird}
      />
      <path
        d="M50,92 v5 M56,91.5 v5.2"
        fill="none"
        stroke={c.bird}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="61" cy="66" r="1.8" fill={c.eye} />
    </svg>
  );
}

/**
 * Mark + wordmark. `stacked` reproduces the supplied stacked lockup
 * (mark above centred type); the default is the horizontal arrangement
 * the header needs.
 */
export function BrandLockup({
  name,
  tagline,
  nameClassName = "",
  taglineClassName = "",
  variant = "primary",
  stacked = false,
}: {
  name: string;
  tagline?: string;
  /** Lets a caller hide the wordmark where there is no room for it. */
  nameClassName?: string;
  taglineClassName?: string;
  variant?: MarkVariant;
  stacked?: boolean;
}) {
  const reversed = variant === "reversed";

  return (
    <span
      className={
        stacked
          ? "flex flex-col items-center gap-2 text-center"
          : "flex items-center gap-2.5"
      }
    >
      <BrandMark
        variant={variant}
        className={stacked ? "h-16 w-16" : "h-11 w-11 shrink-0"}
      />
      <span
        className={
          stacked ? "flex flex-col items-center" : "flex flex-col leading-tight"
        }
      >
        <span
          className={
            "font-display text-base font-bold tracking-tight " +
            (reversed ? "text-white " : "text-kiwi-800 ") +
            nameClassName
          }
        >
          {name}
        </span>
        {tagline && (
          <span
            className={
              "text-xs " +
              (reversed ? "text-brand-cloud " : "text-kiwi-600 ") +
              taglineClassName
            }
          >
            {tagline}
          </span>
        )}
      </span>
    </span>
  );
}

/**
 * "STR · LTR" strapline from the stacked lockup — short-term and long-term
 * rentals. Deliberately untranslated: it's part of the mark, not copy.
 *
 * The lockup sets this in brand sky (#4A9BD4), which only reaches 2.9:1 on
 * the navy footer — under AA for text this small. On navy we step up to
 * brand cloud (5.3:1) and keep the hierarchy with tracking and weight
 * instead of colour.
 */
export function BrandStrapline({ reversed = false }: { reversed?: boolean }) {
  return (
    <span
      className={
        "font-display text-[10px] font-bold tracking-[0.4em] " +
        (reversed ? "text-brand-cloud" : "text-kiwi-500")
      }
    >
      STR · LTR
    </span>
  );
}
