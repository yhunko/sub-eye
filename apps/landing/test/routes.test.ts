import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import config from "../astro.config.mjs";
import { canonical, legalPages, locales, SITE } from "../src/lib/site";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");

/**
 * The four URLs App Store Connect holds as metadata.
 *
 * The app stopped requesting them when `@subeye/legal` moved the documents into
 * the bundle, so this file is now the only thing pinning them — and they still
 * matter, because a reviewer follows the privacy-policy URL and a 404 there is a
 * rejection before a human ever opens the app.
 */
const CONTRACT = [
  "https://www.subeye.cc/en/terms-of-service/",
  "https://www.subeye.cc/en/privacy-policy/",
  "https://www.subeye.cc/uk/terms-of-service/",
  "https://www.subeye.cc/uk/privacy-policy/",
];

describe("legal route contract", () => {
  it("builds exactly the four URLs the app opens", () => {
    const built = locales.flatMap((locale) =>
      legalPages.map((page) => canonical(locale, page)),
    );
    expect(built.sort()).toEqual([...CONTRACT].sort());
  });

  it("has a page file behind every one of them", () => {
    for (const locale of locales) {
      for (const page of legalPages) {
        const file = join(ROOT, "src", "pages", locale, `${page}.astro`);
        expect({
          url: canonical(locale, page),
          exists: existsSync(file),
        }).toEqual({ url: canonical(locale, page), exists: true });
      }
    }
  });

  // The Support URL submitted to App Store Connect. Not part of CONTRACT above:
  // the binary never opens it, a reviewer does, and a 404 there is a 1.5 bounce.
  it("serves a support page per locale", () => {
    for (const locale of locales) {
      expect({
        url: `${SITE}/${locale}/support/`,
        exists: existsSync(join(ROOT, "src", "pages", locale, "support.astro")),
      }).toEqual({ url: `${SITE}/${locale}/support/`, exists: true });
    }
  });

  it("serves a marketing page per locale, none at the bare root", () => {
    for (const locale of locales) {
      expect(
        existsSync(join(ROOT, "src", "pages", locale, "index.astro")),
      ).toBe(true);
    }
    expect(existsSync(join(ROOT, "src", "pages", "index.astro"))).toBe(false);
  });
});

describe("astro config backs the contract", () => {
  it("agrees with src/lib/site.ts about the host", () => {
    expect(config.site).toBe(SITE);
  });

  it("prefixes the default locale — this flag is what produces /en/", () => {
    expect(config.i18n?.routing).toMatchObject({ prefixDefaultLocale: true });
    expect(config.i18n?.defaultLocale).toBe("en");
    expect(config.i18n?.locales).toEqual([...locales]);
  });

  it("keeps the trailing slash the app asks for", () => {
    expect(config.trailingSlash).toBe("always");
    // `directory` is what turns /en/privacy-policy/ into an index.html the host
    // can serve at that exact path; `file` would emit privacy-policy.html.
    expect(config.build?.format).toBe("directory");
  });
});
