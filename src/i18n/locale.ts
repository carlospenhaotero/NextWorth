import { locales, defaultLocale, type Locale } from "@/i18n/config";

/** Type guard: is the given string a supported locale? */
export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Normalize any string to a supported locale, falling back to the default. */
export function toLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : defaultLocale;
}

/** Map an app locale to a BCP-47 tag suitable for Intl.NumberFormat/DateTimeFormat. */
export function localeToIntl(locale: string): string {
  switch (locale) {
    case "es":
      return "es-ES";
    case "en":
      return "en-US";
    default:
      return "en-US";
  }
}
