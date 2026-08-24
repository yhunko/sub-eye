import { beforeEach, describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import type {
  CategoryRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "@subeye/store";
import { eraseDoc, readDoc } from "./document";
import { localPorts } from "./ports";

beforeEach(() => eraseDoc());

const subscription = (
  patch: Partial<SubscriptionRecord> & { id: string },
): SubscriptionRecord => ({
  name: "Netflix",
  cost: "10.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  status: "active",
  autoPaid: true,
  categoryId: null,
  notes: null,
  brandDomain: null,
  paymentDate: "2026-09-01T00:00:00.000Z",
  willBeCancelledAt: null,
  pausedAt: null,
  resumeAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...patch,
});

const category = (
  patch: Partial<CategoryRecord> & { id: string },
): CategoryRecord => ({
  name: "Media",
  emoji: "🎬",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...patch,
});

const phase = (
  patch: Partial<PricePhaseRecord> & { id: string; subscriptionId: string },
): PricePhaseRecord => ({
  kind: "standard",
  cost: "10.00",
  currency: "usd",
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: null,
  appliedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...patch,
});

describe("subscriptions", () => {
  it("creates, lists and reads back by id", async () => {
    await localPorts.subscriptions.create(subscription({ id: "s1" }));

    expect(await localPorts.subscriptions.all()).toHaveLength(1);
    expect((await localPorts.subscriptions.byId("s1"))?.name).toBe("Netflix");
  });

  // A detail screen asks for an id straight out of a route param; an unknown one
  // has to read as "gone", not as a crash.
  it("answers null for an unknown id rather than throwing", async () => {
    expect(await localPorts.subscriptions.byId("nope")).toBeNull();
  });

  it("merges a patch and returns the merged record", async () => {
    await localPorts.subscriptions.create(subscription({ id: "s1" }));

    const next = await localPorts.subscriptions.update("s1", { cost: "12.00" });

    expect(next.cost).toBe("12.00");
    expect(next.name).toBe("Netflix");
    expect((await localPorts.subscriptions.byId("s1"))?.cost).toBe("12.00");
  });

  // A silent no-op here would let a use-case report success on a row it never
  // wrote.
  it("throws when updating an unknown id", async () => {
    await expect(
      localPorts.subscriptions.update("nope", { cost: "1" }),
    ).rejects.toThrow();
  });

  it("removes the subscription", async () => {
    await localPorts.subscriptions.create(subscription({ id: "s1" }));

    await localPorts.subscriptions.remove("s1");

    expect(await localPorts.subscriptions.all()).toEqual([]);
  });

  // ON DELETE CASCADE, which Postgres used to do. Without it the store leaks
  // orphan phases, and the pricing timeline reads them back against a
  // subscription that no longer exists.
  it("removes that subscription's phases with it, and only those", async () => {
    await localPorts.subscriptions.create(subscription({ id: "s1" }));
    await localPorts.subscriptions.create(subscription({ id: "s2" }));
    await localPorts.phases.replaceAll("s1", [
      phase({ id: "p1", subscriptionId: "s1" }),
    ]);
    await localPorts.phases.replaceAll("s2", [
      phase({ id: "p2", subscriptionId: "s2" }),
    ]);

    await localPorts.subscriptions.remove("s1");

    expect(await localPorts.phases.all()).toEqual([
      phase({ id: "p2", subscriptionId: "s2" }),
    ]);
  });
});

describe("categories", () => {
  it("creates, lists and reads back by id", async () => {
    await localPorts.categories.create(category({ id: "c1" }));

    expect(await localPorts.categories.all()).toHaveLength(1);
    expect((await localPorts.categories.byId("c1"))?.name).toBe("Media");
  });

  it("answers null for an unknown id rather than throwing", async () => {
    expect(await localPorts.categories.byId("nope")).toBeNull();
  });

  it("merges a patch and returns the merged record", async () => {
    await localPorts.categories.create(category({ id: "c1" }));

    const next = await localPorts.categories.update("c1", {
      name: "Streaming",
    });

    expect(next).toEqual(category({ id: "c1", name: "Streaming" }));
  });

  it("throws when updating an unknown id", async () => {
    await expect(
      localPorts.categories.update("nope", { name: "x" }),
    ).rejects.toThrow();
  });

  // ON DELETE SET NULL. The delete-confirmation copy in the app counts exactly
  // these rows before the delete, so a cascade here would make the UI lie and
  // then take the subscriptions with it.
  it("keeps its subscriptions and nulls their categoryId", async () => {
    await localPorts.categories.create(category({ id: "c1" }));
    await localPorts.categories.create(category({ id: "c2" }));
    await localPorts.subscriptions.create(
      subscription({ id: "s1", categoryId: "c1" }),
    );
    await localPorts.subscriptions.create(
      subscription({ id: "s2", categoryId: "c2" }),
    );

    await localPorts.categories.remove("c1");

    expect(await localPorts.categories.all()).toEqual([category({ id: "c2" })]);
    expect((await localPorts.subscriptions.byId("s1"))?.categoryId).toBeNull();
    expect((await localPorts.subscriptions.byId("s2"))?.categoryId).toBe("c2");
  });
});

describe("phases", () => {
  it("lists all phases and filters by subscription", async () => {
    await localPorts.phases.replaceAll("s1", [
      phase({ id: "p1", subscriptionId: "s1" }),
    ]);
    await localPorts.phases.replaceAll("s2", [
      phase({ id: "p2", subscriptionId: "s2" }),
    ]);

    expect(await localPorts.phases.all()).toHaveLength(2);
    expect(await localPorts.phases.bySubscription("s1")).toEqual([
      phase({ id: "p1", subscriptionId: "s1" }),
    ]);
  });

  // replaceAll is the whole write path for a pricing schedule: it must swap one
  // subscription's timeline without touching a neighbour's.
  it("replaces only the named subscription's phases", async () => {
    await localPorts.phases.replaceAll("s1", [
      phase({ id: "p1", subscriptionId: "s1" }),
    ]);
    await localPorts.phases.replaceAll("s2", [
      phase({ id: "p2", subscriptionId: "s2" }),
    ]);

    await localPorts.phases.replaceAll("s1", [
      phase({ id: "p3", subscriptionId: "s1" }),
    ]);

    expect(
      (await localPorts.phases.bySubscription("s1")).map((p) => p.id),
    ).toEqual(["p3"]);
    expect(
      (await localPorts.phases.bySubscription("s2")).map((p) => p.id),
    ).toEqual(["p2"]);
  });

  // A caller cannot filter the applied phases itself: a boundary firing between
  // its read and its write would be dropped along with the price that boundary
  // already put on the row.
  it("swaps only the pending phases, keeping the applied timeline", async () => {
    await localPorts.phases.replaceAll("s1", [
      phase({
        id: "p1",
        subscriptionId: "s1",
        appliedAt: "2026-01-01T00:00:00.000Z",
      }),
      phase({ id: "p2", subscriptionId: "s1" }),
    ]);
    await localPorts.phases.replaceAll("s2", [
      phase({ id: "p3", subscriptionId: "s2" }),
    ]);

    await localPorts.phases.replacePending("s1", [
      phase({ id: "p4", subscriptionId: "s1" }),
    ]);

    expect(
      (await localPorts.phases.bySubscription("s1")).map((p) => p.id),
    ).toEqual(["p1", "p4"]);
    expect(
      (await localPorts.phases.bySubscription("s2")).map((p) => p.id),
    ).toEqual(["p3"]);
  });

  it("removes a phase by id", async () => {
    await localPorts.phases.replaceAll("s1", [
      phase({ id: "p1", subscriptionId: "s1" }),
      phase({ id: "p2", subscriptionId: "s1" }),
    ]);

    await localPorts.phases.remove("p1");

    expect((await localPorts.phases.all()).map((p) => p.id)).toEqual(["p2"]);
  });

  // All four writes or none: the price must never be live on the subscription
  // while the phase still reads as pending, and the phase it supersedes must not
  // stay open behind it.
  it("stamps the phase, closes the preceding one and copies the price", async () => {
    await localPorts.subscriptions.create(subscription({ id: "s1" }));
    await localPorts.phases.replaceAll("s1", [
      phase({
        id: "p1",
        subscriptionId: "s1",
        kind: "intro",
        appliedAt: "2026-01-01T00:00:00.000Z",
      }),
      phase({
        id: "p2",
        subscriptionId: "s1",
        cost: "20.00",
        currency: "eur",
        startsAt: "2026-06-01T00:00:00.000Z",
      }),
    ]);

    await localPorts.phases.applyBoundary({
      subscriptionId: "s1",
      phaseId: "p2",
      precedingPhaseId: "p1",
      cost: "20.00",
      currency: "eur",
      appliedAt: "2026-03-01T09:30:00.000Z",
      startsAt: "2026-03-01T00:00:00.000Z",
    });

    const phases = await localPorts.phases.bySubscription("s1");
    const applied = phases.find((p) => p.id === "p2");
    const preceding = phases.find((p) => p.id === "p1");

    expect(applied?.appliedAt).toBe("2026-03-01T09:30:00.000Z");
    // An early apply must move startsAt too, or getUpcomingPhase keeps
    // reporting the phase that already fired.
    expect(applied?.startsAt).toBe("2026-03-01T00:00:00.000Z");
    expect(preceding?.endsAt).toBe("2026-03-01T00:00:00.000Z");

    const subscriptionRow = await localPorts.subscriptions.byId("s1");
    expect(subscriptionRow?.cost).toBe("20.00");
    expect(subscriptionRow?.currency).toBe("eur");
  });

  // The scheduler fires this from a background task against whatever it read a
  // moment ago; a row deleted in between must not take the task down.
  it("does not throw when the phase or subscription is gone", async () => {
    await localPorts.phases.applyBoundary({
      subscriptionId: "gone",
      phaseId: "gone",
      precedingPhaseId: null,
      cost: "1.00",
      currency: "usd",
      appliedAt: "2026-03-01T09:30:00.000Z",
      startsAt: "2026-03-01T00:00:00.000Z",
    });
  });
});

describe("rates", () => {
  // The wiring, not the derivation — an unwired rates port answers {} and every
  // amount on the dashboard silently stays in its own currency.
  it("is backed by the on-device rate table", async () => {
    const rates = await localPorts.rates.forBase("uah");

    // Deliberately provenance-agnostic: whether the seed or a cached refresh
    // backs it is fx.test.ts's business. An unwired port answers {} and fails
    // both of these.
    expect(rates.uah).toBe(1);
    expect(rates.usd).toBeGreaterThan(0);
  });
});

describe("preferences", () => {
  it("reads the defaults on a cold install", async () => {
    expect(await localPorts.preferences.read()).toEqual({
      // Device-seeded on the cold path; the values themselves are
      // document.test.ts's business.
      preferredCurrency: "eur",
      preferredTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: "DD/MM/YYYY",
      locale: "en",
      theme: "system",
    });
  });

  it("merges a patch and leaves the rest alone", async () => {
    const next = await localPorts.preferences.write({
      preferredCurrency: "usd",
    });

    expect(next.preferredCurrency).toBe("usd");
    expect(next.locale).toBe("en");
    expect((await localPorts.preferences.read()).preferredCurrency).toBe("usd");
  });
});

describe("newId and now", () => {
  // newId is the only source of record ids; a repeat overwrites a row.
  it("returns a distinct id per call", () => {
    const ids = new Set([
      localPorts.newId(),
      localPorts.newId(),
      localPorts.newId(),
    ]);

    expect(ids.size).toBe(3);
  });

  it("reads the clock through the port", () => {
    expect(localPorts.now()).toBeInstanceOf(Date);
  });
});

describe("persistence", () => {
  it("writes through to the document, not to memory", async () => {
    await localPorts.subscriptions.create(subscription({ id: "s1" }));
    await localPorts.categories.create(category({ id: "c1" }));
    await localPorts.phases.replaceAll("s1", [
      phase({ id: "p1", subscriptionId: "s1" }),
    ]);

    const doc = readDoc();

    expect(doc.subscriptions.map((s) => s.id)).toEqual(["s1"]);
    expect(doc.categories.map((c) => c.id)).toEqual(["c1"]);
    expect(doc.phases.map((p) => p.id)).toEqual(["p1"]);
  });
});
