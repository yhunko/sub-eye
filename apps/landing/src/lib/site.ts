/**
 * The URL contract with the shipped iOS binary.
 *
 * The app renders the documents itself, out of `@subeye/legal`, so it no longer
 * requests these — but App Store Connect stores the privacy-policy URL as
 * metadata and a reviewer follows it, so a 404 is still a rejection.
 * `test/routes.test.ts` asserts the four strings against the page files that
 * actually exist.
 */
export const SITE = "https://www.subeye.cc";

export const locales = ["en", "uk"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const legalPages = ["terms-of-service", "privacy-policy"] as const;
export type LegalPage = (typeof legalPages)[number];

/**
 * `support` backs the App Store Connect Support URL. It is deliberately outside
 * `legalPages`: that list is the four-URL contract the shipped binary opens, and
 * adding a fifth member would silently widen it.
 */
export type SitePage = LegalPage | "support";

export const isLocale = (value: unknown): value is Locale =>
  locales.includes(value as Locale);

/** Every path on this site is locale-prefixed and trailing-slashed. */
export const path = (locale: Locale, page?: SitePage): string =>
  page ? `/${locale}/${page}/` : `/${locale}/`;

export const canonical = (locale: Locale, page?: SitePage): string =>
  `${SITE}${path(locale, page)}`;

/** The locale a language switch should offer, given the one being viewed. */
export const otherLocale = (locale: Locale): Locale =>
  locale === "en" ? "uk" : "en";

/**
 * Pro is one payment, per storefront. One constant so the pricing section and
 * the JSON-LD `offers` cannot quote different numbers — $11.99 is the price,
 * not a launch price, so nothing here expires.
 */
export const proPrice = { usd: 11.99, uah: 199, eur: 9.99 };
