import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), "utf8");

const home = read("src", "layouts", "Home.astro");
const base = read("src", "layouts", "Base.astro");
const headers = read("public", "_headers");

/** The single `Content-Security-Policy:` line in public/_headers, by directive. */
const csp = (): Record<string, string[]> => {
  const [line, ...extra] = headers
    .split("\n")
    .filter((l) => l.trim().startsWith("Content-Security-Policy:"));
  // A second policy header would be intersected with the first by Cloudflare,
  // not replace it, so the widget would break in a way no directive explains.
  expect([line !== undefined, extra]).toEqual([true, []]);

  return Object.fromEntries(
    (line ?? "")
      .split(":")
      .slice(1)
      .join(":")
      .split(";")
      .map((part) => part.trim().split(/\s+/))
      .filter(([name]) => name)
      .map(([name, ...values]) => [name, values]),
  );
};

describe("StartupBar widget", () => {
  it("is mounted on the marketing pages and nowhere else", () => {
    expect(home).toContain("https://startupbar.co/widget/loader.js");
    expect(home).toContain(
      'data-startup-id="5bebca65-f371-43e4-81c9-3475815f2c94"',
    );
    // Astro bundles and hoists a `<script>` it owns; the vendor tag has to
    // survive verbatim, or `document.currentScript` reads no startup id.
    expect(home).toMatch(/<script[^>]*\bis:inline\b/);

    // The four legal URLs are App Store Connect metadata a reviewer opens.
    for (const page of ["privacy-policy", "terms-of-service", "support"]) {
      for (const locale of ["en", "uk"]) {
        expect(read("src", "pages", locale, `${page}.astro`)).not.toContain(
          "startupbar",
        );
      }
    }
    expect(base).not.toContain("startupbar");
  });

  // The loader adds a script, an iframe and an image pixel. Each one is a
  // separate directive and a missing one fails silently at runtime.
  it("is allowed by every CSP directive it needs", () => {
    const policy = csp();
    for (const directive of ["script-src", "frame-src", "img-src"]) {
      expect([directive, policy[directive]]).toEqual([
        directive,
        expect.arrayContaining(["https://startupbar.co"]),
      ]);
    }
  });

  it("is the only third-party origin the site loads", () => {
    const origins = new Set(
      [...headers.matchAll(/https:\/\/[a-z0-9.-]+/gi)].map((m) => m[0]),
    );
    expect([...origins]).toEqual(["https://startupbar.co"]);
  });
});

describe("Smart App Banner", () => {
  // Safari renders it from the meta alone. There is no markup to inspect, no
  // console error if the id is wrong — the banner simply does not appear. So
  // the digits are never retyped here: the meta interpolates the same constant
  // the badge's href is built from, and this asserts it still does.
  it("reads the App Store id rather than repeating it", () => {
    const meta = base.match(/<meta name="apple-itunes-app"[^>]*>/)?.[0] ?? "";
    expect(meta).toContain("APP_STORE_ID");
    expect(meta).not.toMatch(/\d{4,}/);
  });
});
