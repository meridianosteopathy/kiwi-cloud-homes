import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PersonaCard } from "@/components/PersonaCard";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Landing />;
}

/**
 * The landing page is a single question with two answers. It deliberately
 * carries no marketing copy: everything above the cards competes with the
 * only action on the page, and on a phone that pushed the choice out of
 * sight. Both cards fit above the fold at 390x844.
 */
function Landing() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:pt-16">
      <section className="text-center">
        <h1 className="font-display text-2xl font-bold leading-tight text-kiwi-900 sm:text-4xl">
          {t("Landing.title")}
        </h1>
        <p className="mt-3 text-sm font-medium uppercase tracking-wider text-kiwi-600">
          {t("Landing.chooseOne")}
        </p>
      </section>

      {/* Relocation persona is intentionally omitted for now — revisit later. */}
      <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-6">
        <PersonaCard
          href="/tourist"
          title={t("Persona.tourist.title")}
          blurb={t("Persona.tourist.blurb")}
          cta={t("Persona.tourist.cta")}
          icon={<TouristIcon />}
        />
        <PersonaCard
          href="/school"
          title={t("Persona.school.title")}
          blurb={t("Persona.school.blurb")}
          cta={t("Persona.school.cta")}
          icon={<SchoolIcon />}
        />
      </div>
    </div>
  );
}

function TouristIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <path d="M3 19h18" />
      <path d="M3 19 10 7l4 6.5" />
      <path d="m12.5 15 3.5-5 5 9" />
      <circle cx="17.5" cy="4.5" r="1.8" />
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-7 w-7"
    >
      <path d="M12 4 2 9l10 5 10-5-10-5Z" />
      <path d="M6 11.5V17c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5.5" />
      <path d="M21 9.5V15" />
    </svg>
  );
}
