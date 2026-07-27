import { describe, expect, it } from "bun:test";

// brand-search.ts reads the optional Brandfetch id through shared/config/env,
// which validates the two REQUIRED vars at import time. CI has no .env, so they
// are set before the dynamic import below — same as cache.test.ts.
process.env.EXPO_PUBLIC_API_URL = "https://api.test";
process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ??= "pk_test_x";

const { brandSearchUrl, toBrandHits } = await import("./brand-search");

describe("brandSearchUrl", () => {
  it("escapes the query, which travels in the path and not a parameter", () => {
    // "AT&T" unescaped would still resolve; "a/b" would rewrite the route and 404.
    expect(brandSearchUrl("a/b", "cid")).toBe(
      "https://api.brandfetch.io/v2/search/a%2Fb?c=cid",
    );
    expect(brandSearchUrl("AT&T", "cid")).toContain("/search/AT%26T?");
  });

  it("omits the parameter entirely when no client id is configured", () => {
    // Not `?c=null`, and not `?c=` — the endpoint answers a bare path, and a
    // present-but-empty parameter is the shape most likely to be rejected.
    expect(brandSearchUrl("netflix", null)).toBe(
      "https://api.brandfetch.io/v2/search/netflix",
    );
  });
});

describe("toBrandHits", () => {
  it("keeps only name and domain", () => {
    expect(
      toBrandHits([
        { name: "Netflix", domain: "netflix.com", icon: "x", brandId: "1" },
      ]),
    ).toEqual([{ name: "Netflix", domain: "netflix.com" }]);
  });

  it("falls back to the domain when the name is missing", () => {
    expect(toBrandHits([{ domain: "netflix.com" }])).toEqual([
      { name: "netflix.com", domain: "netflix.com" },
    ]);
  });

  it("drops entries with no usable domain rather than rendering a blank row", () => {
    expect(toBrandHits([{ name: "Netflix" }, { domain: "" }, null])).toEqual(
      [],
    );
  });

  it("survives a response that is not an array at all", () => {
    // A rate-limit or error body is an object, and this runs on a screen the
    // user opened deliberately — it must degrade to empty, never throw.
    expect(toBrandHits({ message: "Too many requests" })).toEqual([]);
    expect(toBrandHits(null)).toEqual([]);
  });
});
