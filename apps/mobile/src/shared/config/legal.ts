import { getLocale } from "@/shared/i18n";

// Hosted, not bundled: legal copy changes without a store release. Shared by the
// sign-up consent row and the Settings → Legal group so the two cannot drift.
const SITE = "https://www.subeye.cc";

/**
 * The marketing site serves English at the root and every other locale under its
 * own prefix (`/uk/...`). Resolved per call, never at module load — `getLocale()`
 * is only correct once the i18n bootstrap has run.
 *
 * ponytail: a string prefix, not a locale→URL map. Add the map the day a locale
 * needs a URL that is not `/{locale}/{page}/`.
 */
const localePrefix = () => {
  const locale = getLocale();
  return locale === "en" ? "" : `/${locale}`;
};

export const termsUrl = () => `${SITE}${localePrefix()}/terms-of-service/`;

/** Required by App Store Connect and Google Play — not optional metadata. */
export const privacyUrl = () => `${SITE}${localePrefix()}/privacy-policy/`;
