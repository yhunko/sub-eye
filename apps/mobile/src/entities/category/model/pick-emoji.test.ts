import { describe, expect, it } from "bun:test";
import { CATEGORY_EMOJIS } from "@subeye/shared";
import { pickCategoryEmoji } from "./pick-emoji";

describe("pickCategoryEmoji", () => {
  // THE failure this prevents: the server validates `emoji` against
  // CATEGORY_EMOJIS and answers 422 for anything else. A derived emoji outside
  // that set makes category creation impossible with no actionable message.
  it("only ever returns an emoji the server accepts", () => {
    const allowed = new Set(CATEGORY_EMOJIS);
    const names = [
      "Streaming",
      "Music",
      "",
      "   ",
      "🎬 unicode name",
      "a".repeat(200),
      "Категорія",
    ];

    for (const name of names) {
      expect(allowed.has(pickCategoryEmoji(name))).toBe(true);
    }
  });

  // Stable, so re-creating a deleted category does not silently change its mark.
  it("is deterministic and ignores case and surrounding space", () => {
    expect(pickCategoryEmoji("Streaming")).toBe(pickCategoryEmoji("Streaming"));
    expect(pickCategoryEmoji("  streaming ")).toBe(
      pickCategoryEmoji("Streaming"),
    );
  });

  // Not a hash-quality assertion — just that distinct names do not all collapse
  // onto one emoji, which would make every category look identical.
  it("spreads common category names across more than one emoji", () => {
    const names = [
      "Streaming",
      "Music",
      "Fitness",
      "Cloud",
      "News",
      "Games",
      "Food",
      "Transport",
    ];
    const distinct = new Set(names.map(pickCategoryEmoji));
    expect(distinct.size).toBeGreaterThan(1);
  });
});
