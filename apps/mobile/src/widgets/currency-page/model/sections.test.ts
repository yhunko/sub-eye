import { describe, expect, it } from "bun:test";
import { CURRENCY_CODES } from "@/shared/lib/format";
import { currencySections } from "./sections";

const build = (search: string, suggested: string[] = ["usd", "eur"]) =>
  currencySections({
    search,
    suggested,
    suggestedTitle: "Suggested",
    resultsTitle: "Results",
  });

describe("at rest", () => {
  it("opens with the caller's suggestions, then one card per initial", () => {
    const sections = build("");

    expect(sections[0]).toEqual({ title: "Suggested", data: ["usd", "eur"] });
    expect(sections[1]?.title).toBe("A");
    expect(sections.at(-1)?.title).toBe("Z");
  });

  // Every code has to be reachable without the search field: a currency that
  // exists in the catalogue but in no section is invisible to anyone who
  // scrolls rather than types.
  it("lists the whole catalogue across the letter sections", () => {
    const listed = build("")
      .slice(1)
      .flatMap((section) => section.data);

    expect(listed).toEqual(CURRENCY_CODES);
  });

  it("drops the suggested card when the caller has nothing to suggest", () => {
    expect(build("", [])[0]?.title).toBe("A");
  });
});

describe("under a query", () => {
  // Letter headings over three results are chrome, and the alphabet is the
  // wrong order once relevance exists.
  it("collapses the alphabet into one ranked list", () => {
    const sections = build("us");

    expect(sections).toHaveLength(1);
    expect(sections[0]?.title).toBe("Results");
    // Exact code, then codes starting with it, then names containing it.
    expect(sections[0]?.data[0]).toBe("usd");
    expect(sections[0]?.data).toContain("aud"); // "Australian Dollar"
  });

  it("matches the name as well as the code", () => {
    expect(build("hryv")[0]?.data).toEqual(["uah"]);
    expect(build("yen")[0]?.data).toContain("jpy");
  });

  it("ignores case and surrounding space", () => {
    expect(build("  PLN ")[0]?.data[0]).toBe("pln");
  });

  // An empty section renders a heading over nothing, which reads as a broken
  // list rather than as "no matches" — the screen shows its own empty state.
  it("answers no sections at all when nothing matches", () => {
    expect(build("qqqq")).toEqual([]);
  });
});
