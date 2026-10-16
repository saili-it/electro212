export const SUPPORTED_LOCALES = ["fr", "ar"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

type Translatable = { locale: string };

/** Picks the translation matching the given locale, falling back to the default locale. */
export function pickTranslation<T extends Translatable>(
  translations: T[],
  locale: Locale = DEFAULT_LOCALE,
): T | undefined {
  return (
    translations.find((translation) => translation.locale === locale) ??
    translations.find((translation) => translation.locale === DEFAULT_LOCALE)
  );
}
