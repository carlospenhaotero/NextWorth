import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { locales, defaultLocale, type Locale } from "@/i18n/config";

function isSupported(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/**
 * Resolve the active locale for the request, in order:
 *   1. NEXT_LOCALE cookie (persisted user preference), if valid.
 *   2. First supported match in the Accept-Language header.
 *   3. Default locale ("en").
 */
async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (isSupported(cookieLocale)) return cookieLocale;

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language");
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(",")) {
      const tag = part.split(";")[0]?.trim().toLowerCase();
      if (!tag) continue;
      const base = tag.split("-")[0];
      if (isSupported(base)) return base as Locale;
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // An explicit locale (e.g. getTranslations({ locale: "en" })) overrides the
  // request-based resolution. Used to force the landing page to English.
  const requested = await requestLocale;
  const locale = isSupported(requested) ? requested : await resolveLocale();
  const messages = (await import(`../../messages/${locale}.json`)).default;
  return { locale, messages };
});
