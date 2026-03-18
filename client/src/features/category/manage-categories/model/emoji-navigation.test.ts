import { describe, expect, it } from "bun:test";
import { resolveNextEmojiFocusIndex } from "./emoji-navigation";

describe("resolveNextEmojiFocusIndex", () => {
  it("moves focus with arrow keys and clamps within bounds", () => {
    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowRight",
        currentIndex: 0,
        total: 10,
      }),
    ).toBe(1);

    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowLeft",
        currentIndex: 0,
        total: 10,
      }),
    ).toBe(0);

    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowDown",
        currentIndex: 8,
        total: 10,
      }),
    ).toBe(9);

    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowUp",
        currentIndex: 3,
        total: 10,
      }),
    ).toBe(0);
  });

  it("returns null for unsupported keys or empty data", () => {
    expect(
      resolveNextEmojiFocusIndex({
        key: "Enter",
        currentIndex: 1,
        total: 10,
      }),
    ).toBeNull();

    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowRight",
        currentIndex: 0,
        total: 0,
      }),
    ).toBeNull();
  });
});
