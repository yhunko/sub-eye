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

  it("keeps column when moving vertically between emoji groups", () => {
    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowDown",
        currentIndex: 11,
        total: 24,
        cols: 5,
        groupSizes: [12, 12],
      }),
    ).toBe(13);

    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowUp",
        currentIndex: 13,
        total: 24,
        cols: 5,
        groupSizes: [12, 12],
      }),
    ).toBe(11);

    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowDown",
        currentIndex: 9,
        total: 24,
        cols: 5,
        groupSizes: [12, 12],
      }),
    ).toBe(16);

    expect(
      resolveNextEmojiFocusIndex({
        key: "ArrowUp",
        currentIndex: 16,
        total: 24,
        cols: 5,
        groupSizes: [12, 12],
      }),
    ).toBe(9);
  });

  it("supports Tab and Shift+Tab row navigation with wrapping", () => {
    expect(
      resolveNextEmojiFocusIndex({
        key: "Tab",
        currentIndex: 4,
        total: 10,
      }),
    ).toBe(5);

    expect(
      resolveNextEmojiFocusIndex({
        key: "Tab",
        currentIndex: 9,
        total: 10,
      }),
    ).toBe(0);

    expect(
      resolveNextEmojiFocusIndex({
        key: "Tab",
        shiftKey: true,
        currentIndex: 5,
        total: 10,
      }),
    ).toBe(4);

    expect(
      resolveNextEmojiFocusIndex({
        key: "Tab",
        shiftKey: true,
        currentIndex: 0,
        total: 10,
      }),
    ).toBe(9);
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
