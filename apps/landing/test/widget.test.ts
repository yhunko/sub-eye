import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = join(dirname(new URL(import.meta.url).pathname), "..");
const read = (...parts: string[]) => readFileSync(join(ROOT, ...parts), "utf8");

const base = read("src", "layouts", "Base.astro");
const headers = read("public", "_headers");

/** Every `.astro` file under `src/`, contents included. */
const templates = (): { path: string; text: string }[] => {
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

/** The single `Content-Security-Policy:` line in public/_headers, by directive. */
const csp = (): Record<string, string[]> => {
  const [line, ...extra] = headers
    .split("\n")
    .filter((l) => l.trim().startsWith("Content-Security-Policy:"));
  // A second policy header would be intersected with the first by Cloudflare,
  // not replace it, so a page could end up stricter than either says.
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

// "It stays on your phone" is the page's own argument, so the page loads
// nothing from anyone else: no script, no frame, no third-party host.
describe("no third-party code", () => {
  it("ships no script tag that loads code", () => {
    for (const { path, text } of templates()) {
      const loaders = [...text.matchAll(/<script\b[^>]*>/g)]
        .map((m) => m[0])
        .filter(
          (tag) => /\bsrc=/.test(tag) || !/application\/ld\+json/.test(tag),
        );
      expect({ path, loaders }).toEqual({ path, loaders: [] });
    }
  });

  it("refuses scripts and frames in the CSP", () => {
    const policy = csp();
    expect(policy["script-src"]).toEqual(["'none'"]);
    expect(policy["frame-src"]).toEqual(["'none'"]);
    expect(policy["default-src"]).toEqual(["'self'"]);
  });

  it("names no origin but this one anywhere in the headers", () => {
    expect(headers).not.toMatch(/https?:\/\//);
    expect(headers.toLowerCase()).not.toContain("startupbar");
  });

  it("references no third-party host from a template", () => {
    for (const { path, text } of templates()) {
      expect({
        path,
        startupbar: text.toLowerCase().includes("startupbar"),
      }).toEqual({
        path,
        startupbar: false,
      });
    }
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
