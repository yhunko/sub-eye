import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { bobby, subeyeListing } from "../src/lib/bobby";
import { ogCard } from "../src/lib/og";
import { priceRises } from "../src/lib/priceRises";
import { articleSchema, homeSchema } from "../src/lib/schema";
import {
  appStoreUrl,
  contentPages,
  freePrice,
  legalPages,
  locales,
  proPrice,
  proPriceUkraine,
  SITE,
  type SitePage,
} from "../src/lib/site";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const PUBLIC = join(ROOT, "public");

const pages: (SitePage | undefined)[] = [
  undefined,
  "support",
  ...legalPages,
  ...contentPages,
];

type Node = Record<string, unknown>;
const graph = (schema: { "@graph": Node[] }, type: string) =>
  schema["@graph"].find((node) => node["@type"] === type);

describe("share cards", () => {
  // A missing card is not a build error: the tag points at a 404 and every
  // share of the page goes out without a picture.
  it("exist for every page in both locales", () => {
    for (const locale of locales) {
      for (const page of pages) {
        const { path } = ogCard(locale, page);
        expect({ path, exists: existsSync(join(PUBLIC, path)) }).toEqual({
          path,
          exists: true,
        });
      }
    }
  });

  it("give the content pages their own card", () => {
    for (const locale of locales) {
      for (const page of contentPages) {
        expect(ogCard(locale, page).path).toBe(`/og/${locale}-${page}.png`);
      }
    }
  });

  it("ship the touch icon the head links to", () => {
    expect(existsSync(join(PUBLIC, "apple-touch-icon.png"))).toBe(true);
  });
});

describe("home structured data", () => {
  // The download is free and Pro is an in-app purchase. A single offer at the
  // Pro price would tell a search engine the app costs that much.
  it("offers the free download and Pro at this storefront's price", () => {
    for (const locale of locales) {
      const app = graph(homeSchema(locale, "d"), "MobileApplication");
      expect(app?.offers).toEqual([
        { "@type": "Offer", price: String(freePrice), priceCurrency: "USD" },
        expect.objectContaining({
          name: "SubEye Pro",
          price: (locale === "uk" ? proPriceUkraine : proPrice.usd).toFixed(2),
          priceCurrency: "USD",
        }),
      ]);
    }
  });

  it("installs from the storefront-neutral App Store link", () => {
    const app = graph(homeSchema("en", "d"), "MobileApplication");
    expect(app?.installUrl).toBe(appStoreUrl);
    expect(app?.operatingSystem).toBe(
      `iOS ${subeyeListing.minimumIOS} or later`,
    );
  });

  it("claims no rating or review the page does not show", () => {
    const text = JSON.stringify(homeSchema("en", "d"));
    expect(text).not.toContain("aggregateRating");
    expect(text).not.toContain("review");
  });
});

describe("content-page structured data", () => {
  it("dates each article by the day its facts were read", () => {
    const lastRead =
      priceRises
        .map((rise) => rise.read)
        .sort()
        .at(-1) ?? "";
    const bobbyArticle = graph(
      articleSchema("en", "bobby-alternative", "h", bobby.read),
      "Article",
    );
    const logArticle = graph(
      articleSchema("uk", "price-increases-2026", "h", lastRead),
      "Article",
    );
    expect(bobbyArticle?.dateModified).toBe(bobby.read);
    expect(logArticle?.dateModified).toBe(lastRead);
    expect(logArticle?.image).toBe(`${SITE}/og/uk-price-increases-2026.png`);
  });
});
