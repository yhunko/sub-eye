import { getLocale } from "@/shared/i18n";
import { legalUrl } from "./legal-url";

// Shared by the sign-up consent notice and the Settings → Legal group so the
// two cannot drift. Resolved per call, never at module load — `getLocale()` is
// only correct once the i18n bootstrap has run.
export const termsUrl = () => legalUrl("terms-of-service", getLocale());

/** Required by App Store Connect and Google Play — not optional metadata. */
export const privacyUrl = () => legalUrl("privacy-policy", getLocale());
