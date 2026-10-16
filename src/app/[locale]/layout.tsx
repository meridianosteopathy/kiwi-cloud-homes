import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Comfortaa is the logo's typeface — we load it for the wordmark and
 * top-level headings (`font-display`) only, so the extra weight isn't paid
 * on body copy. `display: swap` keeps the wordmark from blocking paint.
 */
const comfortaa = Comfortaa({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Site" });
  return {
    metadataBase: siteUrl(),
    title: t("name"),
    description: t("tagline"),
    icons: {
      icon: "/icon.svg",
      apple: "/apple-icon.png",
    },
    openGraph: {
      type: "website",
      title: t("name"),
      description: t("tagline"),
      locale,
      // PNG, not the source SVG — Facebook/WeChat/X all refuse SVG previews.
      images: [{ url: "/brand/og-image.png", width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("name"),
      description: t("tagline"),
      images: ["/brand/og-image.png"],
    },
  };
}

/**
 * Absolute base for OG/Twitter image URLs — social scrapers can't follow
 * relative paths. Set NEXT_PUBLIC_SITE_URL once a custom domain is live;
 * until then we fall back to the Vercel-provided production hostname, and
 * to localhost for local dev.
 */
function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return new URL(explicit);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return new URL(`https://${vercel}`);

  return new URL("http://localhost:3000");
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();

  setRequestLocale(locale as AppLocale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={comfortaa.variable}>
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
