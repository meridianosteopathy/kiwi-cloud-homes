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
 * Absolute base for OG/Twitter image URLs. Social scrapers cannot follow
 * relative paths, so we need a real origin.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL, set explicitly once a custom domain is live
 *   2. VERCEL_PROJECT_PRODUCTION_URL, provided by Vercel (hostname only)
 *   3. URL, provided by Netlify (full URL of the site's primary domain)
 *   4. localhost, for local development
 *
 * This runs while static pages are prerendered, so it must never throw: a
 * mistyped environment variable (for example a hostname without https://)
 * would otherwise fail the whole build. Bare hostnames get https:// added
 * and anything that still is not a valid URL is skipped with a warning.
 */
function siteUrl(): URL {
  const candidates: Array<[string, string | undefined]> = [
    ["NEXT_PUBLIC_SITE_URL", process.env.NEXT_PUBLIC_SITE_URL],
    ["VERCEL_PROJECT_PRODUCTION_URL", process.env.VERCEL_PROJECT_PRODUCTION_URL],
    ["URL", process.env.URL],
  ];
  for (const [name, raw] of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      return new URL(withScheme);
    } catch {
      console.warn(
        `[layout] ignoring ${name}=${JSON.stringify(raw)}: not a valid URL`,
      );
    }
  }
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
