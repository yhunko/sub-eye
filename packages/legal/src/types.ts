export const legalDocKinds = ["terms-of-service", "privacy-policy"] as const;

export type LegalDocKind = (typeof legalDocKinds)[number];

export type LegalLocale = "en" | "uk";

/**
 * A run of text inside a paragraph, list item or definition.
 *
 * The union IS the syntax tree: there is no markup to parse, so a document
 * costs nothing to open on a phone and no renderer has to agree with another
 * about escaping rules. It carries exactly the four constructs the documents
 * use and nothing speculative — adding a fifth means both renderers gain a
 * branch, which is the point of keeping the list this short.
 *
 * Flat, so it cannot nest — `b` on `code` is the one place a document needs to,
 * and a flag is cheaper than making the whole union recursive for it.
 */
export type Inline =
  | string
  | { b: string }
  | { code: string; b?: true }
  | { mailto: string }
  | { doc: LegalDocKind; text: string };

export type Block =
  | { p: Inline[] }
  | { ul: Inline[][] }
  | { dl: { term: string; desc: Inline[] }[] };

export type LegalSection = {
  /**
   * A URL fragment on the marketing site, so it is part of the page's public
   * surface: renaming one breaks any link somebody saved. `content.test.ts`
   * pins the full ordered list per document.
   */
  id: string;
  heading: string;
  blocks: Block[];
};

export type LegalDoc = {
  kind: LegalDocKind;
  locale: LegalLocale;
  title: string;
  /** The marketing site's `<meta name="description">` for this page. */
  description: string;
  /** ISO calendar day, per document — the two do not change together. */
  updated: string;
  /** Paragraphs above the first heading. */
  lead: Block[];
  sections: LegalSection[];
};

/** The address named as the contact in both documents, and in the site footer. */
export const LEGAL_CONTACT_EMAIL = "privacy@subeye.cc";

/** Named as the controller. GDPR Art. 13 wants an identifiable one. */
export const LEGAL_OPERATOR = "Yehor Hunko";

export const isLegalDocKind = (value: unknown): value is LegalDocKind =>
  legalDocKinds.includes(value as LegalDocKind);
