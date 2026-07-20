export type AppLocale = "en" | "uk";

export const APP_LOCALES = ["en", "uk"] as const;

// A device speaking neither English nor Ukrainian reads English. (The retired
// web client used uk as its base locale; mobile deliberately diverges — store
// buyers outside the market get English.)
export const FALLBACK_LOCALE: AppLocale = "en";

export const resolveDeviceLocale = (
  languageCodes: ReadonlyArray<string | null>,
): AppLocale =>
  languageCodes.find((code): code is AppLocale =>
    (APP_LOCALES as readonly string[]).includes(code ?? ""),
  ) ?? FALLBACK_LOCALE;
