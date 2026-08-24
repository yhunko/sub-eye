import { beforeEach, describe, expect, it } from "bun:test";
import type { CategoryRecord } from "@subeye/store";
import { __testing, eraseDoc, readDoc, writeDoc } from "./document";

beforeEach(() => eraseDoc());

const category = (id: string): CategoryRecord => ({
  id,
  name: "Media",
  emoji: "🎬",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("readDoc", () => {
  // A cold install must read as an empty store with real defaults, never as
  // undefined — every screen renders straight off this.
  it("returns defaults on a cold install, not undefined", () => {
    const doc = readDoc();

    expect(doc.v).toBe(1);
    expect(doc.subscriptions).toEqual([]);
    expect(doc.categories).toEqual([]);
    expect(doc.phases).toEqual([]);
    // The device's region currency, not the "uah" a fresh server row used to
    // carry — a first Home screen in Berlin denominated in hryvnia is what the
    // deleted seed hooks existed to prevent.
    expect(doc.preferences.preferredCurrency).toBe("eur");
    // The device's own zone, whatever the machine running this is set to — the
    // cold path adopts it, and every later read takes the stored value.
    expect(doc.preferences.preferredTimezone).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });

  // A blob written by an older build, or a truncated one, must not take the app
  // down at module load, where there is no error boundary yet.
  it("falls back to defaults on an unparseable document", () => {
    __testing.writeSlotRaw("active", "{not json");

    expect(readDoc().subscriptions).toEqual([]);
    expect(readDoc().preferences.preferredCurrency).toBe("eur");
  });

  // A document from a build that predates a field must not read as undefined
  // and blow up the first `.map` above it.
  it("fills in missing arrays and preference keys", () => {
    __testing.writeSlotRaw("active", JSON.stringify({ v: 1 }));
    const doc = readDoc();

    expect(doc.categories).toEqual([]);
    expect(doc.subscriptions).toEqual([]);
    expect(doc.phases).toEqual([]);
    expect(doc.preferences.dateFormat).toBe("DD/MM/YYYY");
  });

  // A `preferences` that is not an object at all would otherwise be spread
  // character by character.
  it("survives a preferences key of the wrong type", () => {
    __testing.writeSlotRaw(
      "active",
      JSON.stringify({ v: 1, preferences: "x" }),
    );

    expect(readDoc().preferences.preferredCurrency).toBe("eur");
  });
});

describe("writeDoc", () => {
  it("round trips a document", () => {
    writeDoc({ ...readDoc(), categories: [category("c1")] });

    expect(readDoc().categories).toEqual([category("c1")]);
  });

  // The whole document is rewritten per mutation, so a crash mid-write loses the
  // document rather than a row. This is the failure the two-slot swap exists
  // for: the write landed in the idle slot and died before the pointer moved,
  // so the previous document is still the live one.
  it("leaves the previous document live when a write dies before the pointer moves", () => {
    writeDoc({ ...readDoc(), categories: [category("c1")] });

    __testing.writeSlotRaw("idle", '{"v":1,"categories":[{"id":"c2"');

    expect(readDoc().categories).toEqual([category("c1")]);
  });

  // The other half of the swap: the live copy itself becoming unreadable falls
  // back to the slot behind it, which costs the last write rather than the store.
  it("falls back to the previous slot when the live one is unreadable", () => {
    writeDoc({ ...readDoc(), categories: [category("c1")] });
    writeDoc({ ...readDoc(), categories: [category("c1"), category("c2")] });

    __testing.writeSlotRaw("active", "{truncated");

    expect(readDoc().categories).toEqual([category("c1")]);
  });

  // Alternation is the whole mechanism — a writeDoc that kept hitting the same
  // slot would pass every test above except this one.
  it("alternates slots so two writes never land in the same one", () => {
    writeDoc({ ...readDoc(), categories: [category("c1")] });
    const first = __testing.activeSlot();
    writeDoc({ ...readDoc(), categories: [category("c2")] });

    expect(__testing.activeSlot()).not.toBe(first);
  });
});

describe("eraseDoc", () => {
  it("clears both slots and the pointer", () => {
    writeDoc({ ...readDoc(), categories: [category("c1")] });
    writeDoc({ ...readDoc(), categories: [category("c2")] });

    eraseDoc();

    expect(readDoc().categories).toEqual([]);
  });
});
