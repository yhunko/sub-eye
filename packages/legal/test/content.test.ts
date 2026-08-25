import { describe, expect, it } from "bun:test";
import {
  type Block,
  getLegalDoc,
  type Inline,
  isLegalDocKind,
  LEGAL_CONTACT_EMAIL,
  type LegalDoc,
  type LegalDocKind,
  type LegalLocale,
  legalDocKinds,
} from "../src/index";

const LOCALES: LegalLocale[] = ["en", "uk"];

/**
 * Section ids are URL fragments on the marketing site — a link somebody saved
 * to `#sub-processors` breaks the day one is renamed, and the app's sheet and
 * the site have to agree on them. Pinned as literals for the same reason
 * `apps/landing/test/routes.test.ts` pins the four page URLs.
 */
const SECTION_IDS: Record<LegalDocKind, string[]> = {
  "privacy-policy": [
    "who-is-responsible",
    "on-your-device",
    "what-leaves-the-device",
    "sub-processors",
    "brand-logo-search",
    "why-it-is-held",
    "retention-and-deletion",
    "your-rights",
    "children",
    "changes",
  ],
  "terms-of-service": [
    "who-you-agree-with",
    "what-subeye-is",
    "using-it",
    "your-data-is-yours",
    "free-and-pro",
    "notifications",
    "availability",
    "ending-it",
    "changes",
    "law",
  ],
};

const blocksOf = (doc: LegalDoc): Block[] => [
  ...doc.lead,
  ...doc.sections.flatMap((section) => section.blocks),
];

const runsOf = (block: Block): Inline[][] =>
  "p" in block
    ? [block.p]
    : "ul" in block
      ? block.ul
      : block.dl.map((entry) => entry.desc);

const allRuns = (doc: LegalDoc): Inline[] =>
  blocksOf(doc).flatMap((block) => runsOf(block).flat());

const rendered = (runs: Inline[]): string =>
  runs
    .map((run) =>
      typeof run === "string"
        ? run
        : "code" in run
          ? run.code
          : "b" in run
            ? run.b
            : "mailto" in run
              ? run.mailto
              : run.text,
    )
    .join("");

const everyDoc = legalDocKinds.flatMap((kind) =>
  LOCALES.map((locale) => ({ kind, locale, doc: getLegalDoc(kind, locale) })),
);

describe("legal documents", () => {
  for (const { kind, locale, doc } of everyDoc) {
    describe(`${kind} (${locale})`, () => {
      it("is filed under the kind and locale it claims", () => {
        expect({ kind: doc.kind, locale: doc.locale }).toEqual({
          kind,
          locale,
        });
      });

      it("carries a title and a page description", () => {
        expect(doc.title.length).toBeGreaterThan(0);
        expect(doc.description.length).toBeGreaterThan(0);
      });

      it("has an ISO calendar day for `updated`", () => {
        expect(doc.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(doc.updated))).toBe(false);
      });

      // The whole point of the package: two renderers, one set of anchors. A
      // translation that drops or reorders a section is the failure this
      // catches, and nothing else would.
      it("uses the pinned section ids, in order", () => {
        expect(doc.sections.map((section) => section.id)).toEqual(
          SECTION_IDS[kind],
        );
      });

      it("gives every section a heading in its own language", () => {
        for (const section of doc.sections) {
          expect(section.heading.length).toBeGreaterThan(0);
          expect(section.blocks.length).toBeGreaterThan(0);
        }
      });

      it("names only the one contact address", () => {
        for (const run of allRuns(doc)) {
          if (typeof run === "object" && "mailto" in run) {
            expect(run.mailto).toBe(LEGAL_CONTACT_EMAIL);
          }
        }
      });

      it("cross-links only to a document that exists", () => {
        for (const run of allRuns(doc)) {
          if (typeof run === "object" && "doc" in run) {
            expect(isLegalDocKind(run.doc)).toBe(true);
          }
        }
      });

      it("holds no empty block, list or run", () => {
        for (const block of blocksOf(doc)) {
          const runs = runsOf(block);
          expect(runs.length).toBeGreaterThan(0);
          for (const group of runs) {
            expect(group.length).toBeGreaterThan(0);
            expect(rendered(group).length).toBeGreaterThan(0);
          }
        }
      });

      // The source markup hard-wraps prose, and HTML collapses that on the way
      // to the screen. Nothing collapses it in a React Native <Text>, so a
      // transcription that kept its newlines looks correct on the site and
      // ragged in the app.
      it("carries prose as single-spaced lines", () => {
        for (const block of blocksOf(doc)) {
          for (const group of runsOf(block)) {
            const text = rendered(group);
            expect(text).not.toMatch(/[\n\t]/);
            expect(text).not.toMatch(/ {2}/);
            expect(text).toBe(text.trim());
          }
        }
      });
    });
  }

  it("reads English for a locale it does not publish", () => {
    expect(getLegalDoc("privacy-policy", "pl").locale).toBe("en");
    expect(getLegalDoc("terms-of-service", "").locale).toBe("en");
  });
});
