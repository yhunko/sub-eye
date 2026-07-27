import type { AppLocale } from "@/shared/i18n";

// Hosted, not bundled: legal copy changes without a store release.
const SITE = "https://www.subeye.cc";

export type LegalPage = "terms-of-service" | "privacy-policy";

/**
 * EVERY locale is prefixed, English included — `/en/...`, not the bare root.
 *
 * This tracks the landing redesign, which serves `/en` and `/uk`. It does NOT
 * describe the site as it stands today: at the time of writing only
 * `subeye.cc/terms-of-service/` (unprefixed) resolves and the privacy policy
 * does not exist at all. **These four URLs must be live before submission** —
 * App Store Connect requires a resolving Privacy Policy URL, and Settings →
 * Legal opens them in front of the reviewer.
 *
 * Split from `legal.ts` so it can be tested: that module reaches `getLocale()`
 * through the i18n barrel, which pulls Paraglide and then React Native, and a
 * `bun:test` file that imports React Native aborts — taking unrelated test files
 * down with it. The `AppLocale` import here is type-only, so it erases.
 */
export const legalUrl = (page: LegalPage, locale: AppLocale): string =>
  `${SITE}/${locale}/${page}/`;
