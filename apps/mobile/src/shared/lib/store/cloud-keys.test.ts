import { describe, expect, it } from "bun:test";
import {
  applyEntries,
  diffEntries,
  docToEntries,
  snapshotAsChanges,
} from "./cloud-keys";
import type { StoreDoc } from "./document";

const subscription = (id: string, name = id) => ({
  id,
  name,
  cost: "9.99",
  currency: "usd",
  every: 1,
  period: "month",
  status: "active",
  autoPaid: true,
  categoryId: null,
  notes: null,
  brandDomain: null,
  paymentDate: "2026-09-01T00:00:00.000Z",
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
});

const category = (id: string, name = id) => ({
  id,
  name,
  emoji: "🎬",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
});

const phase = (id: string, subscriptionId: string) => ({
  id,
  subscriptionId,
  kind: "standard",
  cost: "9.99",
  currency: "usd",
  startsAt: "2026-08-01T00:00:00.000Z",
  endsAt: null,
  appliedAt: null,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
});

const doc = (over: Partial<StoreDoc> = {}): StoreDoc =>
  ({
    v: 1,
    preferences: {
      preferredCurrency: "usd",
      preferredTimezone: "UTC",
      dateFormat: "DD/MM/YYYY",
      locale: "en",
      theme: "system",
    },
    categories: [],
    subscriptions: [],
    phases: [],
    ...over,
  }) as StoreDoc;

describe("docToEntries", () => {
  it("gives every record its own key", () => {
    const entries = docToEntries(
      doc({
        subscriptions: [subscription("s1"), subscription("s2")] as never,
        categories: [category("c1")] as never,
        phases: [phase("p1", "s1")] as never,
      }),
    );

    expect(Object.keys(entries).sort()).toEqual([
      "cat.c1",
      "phase.p1",
      "prefs",
      "sub.s1",
      "sub.s2",
    ]);
  });
});

describe("diffEntries", () => {
  it("writes nothing when the cloud already matches", () => {
    // The whole document is rewritten on every mutation and this runs after
    // each one. Without the value comparison the app would spend an iCloud
    // write on every record on every save.
    const entries = docToEntries(
      doc({ subscriptions: [subscription("s1")] as never }),
    );
    expect(diffEntries(entries, entries)).toEqual({ set: {}, remove: [] });
  });

  it("removes the key of a record that is gone", () => {
    const before = docToEntries(
      doc({ subscriptions: [subscription("s1"), subscription("s2")] as never }),
    );
    const after = docToEntries(
      doc({ subscriptions: [subscription("s1")] as never }),
    );

    expect(diffEntries(after, before)).toEqual({ set: {}, remove: ["sub.s2"] });
  });

  it("leaves keys it does not own alone", () => {
    // The KV store belongs to the whole app. Erasing a stranger's key because
    // it is not in the document is how a subscription write breaks an unrelated
    // feature.
    const wanted = docToEntries(doc());
    const present = { ...wanted, "some.other.feature": "keep me" };

    expect(diffEntries(wanted, present).remove).toEqual([]);
  });
});

describe("applyEntries", () => {
  it("adds a record the cloud has and this device does not", () => {
    const next = applyEntries(doc(), {
      "sub.s1": JSON.stringify(subscription("s1", "Netflix")),
    });

    expect(next.subscriptions).toHaveLength(1);
    expect(next.subscriptions[0]?.name).toBe("Netflix");
  });

  it("replaces rather than duplicates a record it already holds", () => {
    const next = applyEntries(
      doc({ subscriptions: [subscription("s1", "Old")] as never }),
      { "sub.s1": JSON.stringify(subscription("s1", "New")) },
    );

    expect(next.subscriptions).toHaveLength(1);
    expect(next.subscriptions[0]?.name).toBe("New");
  });

  it("treats a missing key as a deletion", () => {
    const next = applyEntries(
      doc({ subscriptions: [subscription("s1"), subscription("s2")] as never }),
      { "sub.s1": null },
    );

    expect(next.subscriptions.map((row) => row.id)).toEqual(["s2"]);
  });

  it("leaves everything the change did not name", () => {
    // The reason this applies changed keys instead of rebuilding from a
    // snapshot: a rebuild deletes every record this device has not pushed yet,
    // which is the whole contents of a device that was offline.
    const before = doc({
      subscriptions: [subscription("s1"), subscription("local-only")] as never,
      categories: [category("c1")] as never,
    });

    const next = applyEntries(before, {
      "sub.s1": JSON.stringify(subscription("s1", "Renamed")),
    });

    expect(next.subscriptions.map((row) => row.id)).toEqual([
      "s1",
      "local-only",
    ]);
    expect(next.categories).toHaveLength(1);
  });

  it("does not cascade a subscription deletion onto its phases", () => {
    // The device that deleted it removed both keys, so the phase deletion
    // arrives as its own change. Cascading here would also delete phases whose
    // subscription simply has not been received yet.
    const next = applyEntries(
      doc({
        subscriptions: [subscription("s1")] as never,
        phases: [phase("p1", "s1")] as never,
      }),
      { "sub.s1": null },
    );

    expect(next.phases).toHaveLength(1);
  });

  it("drops a record whose id does not match the key that carried it", () => {
    // A mismatch means the two disagree about identity, and guessing which one
    // is right writes a row that no key can ever delete again.
    const next = applyEntries(doc(), {
      "sub.s1": JSON.stringify(subscription("s2")),
    });

    expect(next.subscriptions).toEqual([]);
  });

  it("survives a value that is not a record at all", () => {
    const next = applyEntries(doc({ categories: [category("c1")] as never }), {
      "cat.c2": "{ not json",
      "sub.s9": "null",
      prefs: "]]",
    });

    expect(next.categories.map((row) => row.id)).toEqual(["c1"]);
    expect(next.subscriptions).toEqual([]);
    expect(next.preferences.preferredCurrency).toBe("usd");
  });

  it("fills a preference an older device never wrote", () => {
    const next = applyEntries(doc(), {
      prefs: JSON.stringify({ preferredCurrency: "eur" }),
    });

    expect(next.preferences.preferredCurrency).toBe("eur");
    // Not undefined: every screen reading this would otherwise render a blank.
    expect(next.preferences.dateFormat).toBeTruthy();
  });

  it("ignores a deleted preferences key rather than resetting the user", () => {
    const next = applyEntries(doc(), { prefs: null });
    expect(next.preferences.preferredCurrency).toBe("usd");
  });
});

describe("snapshotAsChanges", () => {
  it("keeps only this app's keys", () => {
    const changes = snapshotAsChanges({
      "sub.s1": "{}",
      "some.other.feature": "{}",
    });

    expect(Object.keys(changes)).toEqual(["sub.s1"]);
  });

  it("never names a key as deleted", () => {
    // Linking a device is a UNION. A snapshot says what the cloud HAS; it says
    // nothing about what this device may keep, so nothing here may be a null.
    const changes = snapshotAsChanges({ "sub.s1": "{}" });
    expect(Object.values(changes).every((value) => value !== null)).toBe(true);
  });
});
