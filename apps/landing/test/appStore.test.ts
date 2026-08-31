import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { en } from "../src/i18n/en";
import { uk } from "../src/i18n/uk";
import { APP_STORE_ID, appStoreUrl } from "../src/lib/site";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const BADGE = join(ROOT, "public", "badges", "download-on-the-app-store.svg");

/** Every `.astro` file under `src/`, contents included. */
const sources = (): { path: string; text: string }[] => {
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) return walk(full);
      return entry.name.endsWith(".astro") ? [full] : [];
    });

  return walk(join(ROOT, "src")).map((path) => ({
    path: path.slice(ROOT.length + 1),
    text: readFileSync(path, "utf8"),
  }));
};

describe("App Store link", () => {
  it("carries the id Apple issued at launch", () => {
    expect(APP_STORE_ID).toBe("6795566917");
    expect(appStoreUrl).toBe("https://apps.apple.com/app/id6795566917");
  });

  // The link handed over at launch was the `/us/` one. A storefront segment
  // sends a Ukrainian reader to the US store, on a page whose pricing section
  // is an argument about paying your own country's price.
  it("names no storefront, so Apple picks the reader's own", () => {
    expect(appStoreUrl).not.toMatch(
      /apps\.apple\.com\/[a-z]{2}(-[a-z]{2})?\//i,
    );
  });
});

describe("App Store badge", () => {
  it("is Apple's artwork, unmodified", () => {
    const svg = readFileSync(BADGE, "utf8");
    // The filename Apple ships inside the file. If this is gone, someone has
    // redrawn or re-exported the badge, which the marketing guidelines forbid.
    expect(svg).toContain("Download_on_the_App_Store_Badge_US-UK_RGB_blk");
    expect(svg).toContain('viewBox="0 0 119.66407 40"');
  });

  // "Use one App Store badge per layout." Every page on this site renders the
  // same footer and the same top bar, so a second placement anywhere is a
  // second badge on some page.
  it("is placed exactly once across the whole site", () => {
    const users = sources().filter(({ text }) =>
      text.includes("<AppStoreBadge"),
    );
    expect(users.map(({ path }) => path)).toEqual(["src/layouts/Home.astro"]);
  });

  // The badge is only compliant while it is Apple's file rendered whole. A
  // second reference to the asset is how it starts being cropped into a
  // sprite, tinted, or inlined next to a competitor's.
  it("is reached only through the component that documents the rules", () => {
    const refs = sources().filter(({ text }) =>
      text.includes("badges/download-on-the-app-store"),
    );
    expect(refs.map(({ path }) => path)).toEqual([
      "src/components/AppStoreBadge.astro",
    ]);
  });

  // "Never translate App Store or create your own localized badge." The
  // Ukrainian dictionary translates the sentence around the marks and leaves
  // the marks alone; a well-meant «Магазин застосунків» would break the licence.
  it("leaves Apple's marks in English on both pages", () => {
    for (const c of [en, uk]) {
      expect(c.appStore.badgeAlt).toContain("App Store");
      expect(c.appStore.trademark).toContain("App Store");
      expect(c.appStore.trademark).toContain("Apple Inc.");
      expect(c.appStore.trademark).toContain("iPhone");
      // The badge carries an Apple logo, so the logo is credited as well.
      expect(c.appStore.trademark).toMatch(/Apple logo|логотип Apple/);
    }
  });

  it("credits Apple wherever the site gives legal notice", () => {
    const footer = sources().find(
      ({ path }) => path === "src/components/Footer.astro",
    );
    expect(footer?.text).toContain("c.appStore.trademark");
  });
});
