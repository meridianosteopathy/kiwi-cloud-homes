import { getRequestConfig } from "next-intl/server";
import { routing, type AppLocale } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: AppLocale = (
    requested && (routing.locales as readonly string[]).includes(requested)
      ? requested
      : routing.defaultLocale
  ) as AppLocale;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
