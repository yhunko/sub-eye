import { describe, expect, it } from "bun:test";
import type { CategoryAiSuggestion } from "shared";
import {
  hasDuplicateEnabledSuggestions,
  toggleSuggestionEnabled,
  toggleSuggestionSubscriptionAssignment,
  updateSuggestionEmoji,
  updateSuggestionName,
} from "./suggestions-state";

const createSuggestion = (
  overrides: Partial<CategoryAiSuggestion> = {},
): CategoryAiSuggestion => ({
  draftId: "draft_1",
  name: "Entertainment",
  emoji: "🎬",
  subscriptionIds: ["sub_1"],
  enabled: true,
  ...overrides,
});

describe("suggestions-state", () => {
  it("updates only targeted suggestion fields", () => {
    const base = [
      createSuggestion({ draftId: "draft_1", name: "Video" }),
      createSuggestion({ draftId: "draft_2", name: "Music", emoji: "🎵" }),
    ];

    const withName = updateSuggestionName(base, "draft_2", "Audio");
    const withEmoji = updateSuggestionEmoji(withName, "draft_2", "🎧");
    const withToggle = toggleSuggestionEnabled(withEmoji, "draft_2", false);

    expect(withToggle[0]).toEqual(base[0]);
    expect(withToggle[1]).toMatchObject({
      draftId: "draft_2",
      name: "Audio",
      emoji: "🎧",
      enabled: false,
    });
  });

  it("detects duplicates against existing categories and within enabled suggestions", () => {
    const existing = new Set(["entertainment"]);

    expect(
      hasDuplicateEnabledSuggestions(
        [createSuggestion({ name: " Entertainment " })],
        existing,
      ),
    ).toBe(true);

    expect(
      hasDuplicateEnabledSuggestions(
        [
          createSuggestion({ draftId: "a", name: "Video" }),
          createSuggestion({ draftId: "b", name: "video" }),
        ],
        new Set(),
      ),
    ).toBe(true);
  });

  it("ignores disabled or empty-name suggestions when checking duplicates", () => {
    const suggestions = [
      createSuggestion({ draftId: "a", name: "Video", enabled: false }),
      createSuggestion({ draftId: "b", name: "  ", enabled: true }),
      createSuggestion({ draftId: "c", name: "Audio", enabled: true }),
    ];

    expect(hasDuplicateEnabledSuggestions(suggestions, new Set())).toBe(false);
  });

  it("supports toggling subscription assignments in and out", () => {
    const base = [
      createSuggestion({
        draftId: "draft_1",
        subscriptionIds: ["sub_1", "sub_2"],
      }),
    ];

    const removed = toggleSuggestionSubscriptionAssignment(
      base,
      "draft_1",
      "sub_2",
      false,
    );
    const restored = toggleSuggestionSubscriptionAssignment(
      removed,
      "draft_1",
      "sub_2",
      true,
    );

    expect(removed[0].subscriptionIds).toEqual(["sub_1"]);
    expect(restored[0].subscriptionIds).toEqual(["sub_1", "sub_2"]);
  });
});
