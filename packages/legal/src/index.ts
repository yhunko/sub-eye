import { PRIVACY_POLICY } from "./privacy-policy";
import { TERMS_OF_SERVICE } from "./terms-of-service";
import type { LegalDoc, LegalDocKind, LegalLocale } from "./types";

export type {
  Block,
  Inline,
  LegalDoc,
  LegalDocKind,
  LegalLocale,
  LegalSection,
} from "./types";
export {
  isLegalDocKind,
  LEGAL_CONTACT_EMAIL,
  LEGAL_OPERATOR,
  legalDocKinds,
} from "./types";

const DOCS: Record<LegalDocKind, Record<LegalLocale, LegalDoc>> = {
  "privacy-policy": PRIVACY_POLICY,
  "terms-of-service": TERMS_OF_SERVICE,
};

/**
 * Anything that is not Ukrainian reads English. The app resolves en|uk before
 * calling and the site serves only those two, so the fallback is for the third
 * caller: a locale tag that reached a renderer unvalidated.
 */
export const getLegalDoc = (kind: LegalDocKind, locale: string): LegalDoc =>
  DOCS[kind][locale === "uk" ? "uk" : "en"];
