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

function Landing() {
  const t = useTranslations();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:pt-12">
      <section className="mx-auto max-w-3xl text-center">
        <h1 className="text-2xl font-semibold leading-tight text-kiwi-900 sm:text-4xl">
          {t("Landing.title")}
        </h1>
        <p className="mt-3 text-sm text-kiwi-700 sm:text-base">
          {t("Landing.subtitle")}
        </p>
      </section>

      {/* Persona choice is the first (and only) step on the landing page —
          language is switched from the header toggle, not a separate step. */}
      <section className="mt-8 sm:mt-12">
        <div className="mb-5 text-center">
          <h2 className="text-lg font-semibold text-kiwi-900 sm:text-xl">
            {t("Landing.personaPrompt")}
          </h2>
          <p className="mt-1 text-sm text-kiwi-700">
            {t("Landing.personaHint")}
          </p>
        </div>

        {/* Relocation persona is intentionally omitted for now — revisit later. */}
        <div className="mx-auto grid max-w-3xl gap-4 md:grid-cols-2">
          <PersonaCard
            href="/tourist"
            title={t("Persona.tourist.title")}
            blurb={t("Persona.tourist.blurb")}
            cta={t("Persona.tourist.cta")}
          />
          <PersonaCard
            href="/school"
            title={t("Persona.school.title")}
            blurb={t("Persona.school.blurb")}
            cta={t("Persona.school.cta")}
          />
        </div>
      </section>
    </div>
  );
}
