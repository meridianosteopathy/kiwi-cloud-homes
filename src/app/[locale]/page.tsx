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
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
      <section className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-kiwi-600">
          {t("Site.tagline")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-kiwi-900 sm:text-4xl">
          {t("Landing.title")}
        </h1>
        <p className="mt-4 text-base text-kiwi-700">
          {t("Landing.subtitle")}
        </p>
      </section>

      <section className="mt-14">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold text-kiwi-900">
            {t("Landing.personaPrompt")}
          </h2>
          <p className="mt-1 text-sm text-kiwi-700">
            {t("Landing.personaHint")}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
          <PersonaCard
            disabled
            badge={t("Persona.relocation.comingSoon")}
            title={t("Persona.relocation.title")}
            blurb={t("Persona.relocation.blurb")}
          />
        </div>
      </section>
    </div>
  );
}
