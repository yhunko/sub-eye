import { describe, expect, it } from "bun:test";
import { SubscriptionPeriod } from "@subeye/model";
import {
  cancelSubscription,
  deleteSubscription,
  getSubscription,
  listSubscriptions,
  updateSubscription,
} from "@subeye/store";
import type { PortDeps } from "../src/domains/ports";
import { createPorts } from "../src/domains/ports";

const OWNER = "user_a";
const INTRUDER = "user_b";

const subscriptionRow = () => ({
  id: "sub_a",
  userId: OWNER,
  name: "Netflix",
  cost: "15.00",
  currency: "usd",
  every: 1,
  period: SubscriptionPeriod.MONTH,
  status: "active" as const,
  autoPaid: true,
  categoryId: "cat_a",
  notes: null,
  brandDomain: null,
  paymentDate: "2026-09-15T00:00:00.000Z",
  willBeCancelledAt: new Date("2026-12-01T00:00:00.000Z"),
  pausedAt: null,
  resumeAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const categoryRow = () => ({
  id: "cat_a",
  userId: OWNER,
  name: "Streaming",
  emoji: "📺",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const phaseRow = () => ({
  id: "phase_a",
  subscriptionId: "sub_a",
  userId: OWNER,
  kind: "scheduledChange" as const,
  cost: "18.00",
  currency: "usd",
  startsAt: "2026-11-01T00:00:00.000Z",
  endsAt: null,
  appliedAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

const userRow = () => ({
  id: OWNER,
  preferredCurrency: "usd",
  timezone: "UTC",
  dateFormat: "DD/MM/YYYY",
  locale: "en",
  theme: "system",
});

/**
 * Repositories over arrays, filtering exactly the way the SQL does: a
 * `findByUserId` filters, a `findById` does not, and every write carries the
 * tenant in its WHERE. A fake that ignored the userId argument would prove
 * nothing — the point is that `createPorts` passes the right one and refuses
 * the rows it must not hand over.
 */
const fakeDeps = () => {
  const subscriptions = [subscriptionRow()];
  const categories = [categoryRow()];
  const phases = [phaseRow()];
  const users = [userRow()];
  const writes: string[] = [];

  const deps: PortDeps = {
    subscriptions: {
      findByUserId: async (userId) =>
        subscriptions.filter((row) => row.userId === userId),
      findById: async (id) =>
        subscriptions.find((row) => row.id === id) ?? null,
      create: async (data) => {
        writes.push("subscriptions.create");
        return { ...subscriptionRow(), ...data } as never;
      },
      update: async (id, userId, data) => {
        const row = subscriptions.find(
          (candidate) => candidate.id === id && candidate.userId === userId,
        );
        if (!row) throw new Error("Failed to update subscription");
        writes.push("subscriptions.update");
        Object.assign(row, data);
        return row;
      },
      delete: async (id, userId) => {
        const index = subscriptions.findIndex(
          (row) => row.id === id && row.userId === userId,
        );
        if (index !== -1) {
          writes.push("subscriptions.delete");
          subscriptions.splice(index, 1);
        }
      },
    },
    phases: {
      findByUserId: async (userId) =>
        phases.filter((row) => row.userId === userId),
      findBySubscriptionId: async (subscriptionId, userId) =>
        phases.filter(
          (row) =>
            row.subscriptionId === subscriptionId && row.userId === userId,
        ),
      insertMany: async (rows) => {
        writes.push("phases.insertMany");
        return rows as never;
      },
      deleteMany: async (ids) => {
        if (ids.length > 0) writes.push("phases.deleteMany");
      },
      deleteById: async () => {
        writes.push("phases.deleteById");
      },
      applyBoundaryBatch: async () => {
        writes.push("phases.applyBoundaryBatch");
      },
    },
    categories: {
      findByUserId: async (userId) =>
        categories.filter((row) => row.userId === userId),
      findById: async (id) => categories.find((row) => row.id === id) ?? null,
      create: async (data) => ({ ...categoryRow(), ...data }) as never,
      update: async (id, userId, data) => {
        const row = categories.find(
          (candidate) => candidate.id === id && candidate.userId === userId,
        );
        if (!row) throw new Error("Failed to update category");
        Object.assign(row, data);
        return row;
      },
      delete: async (id, userId) => {
        const index = categories.findIndex(
          (row) => row.id === id && row.userId === userId,
        );
        if (index !== -1) categories.splice(index, 1);
      },
    },
    users: {
      findById: async (id) => users.find((row) => row.id === id) ?? null,
      upsert: async (id, values) => {
        const existing = users.find((row) => row.id === id);
        if (existing) return Object.assign(existing, values);
        const created = { ...userRow(), id, ...values };
        users.push(created);
        return created;
      },
    },
    currency: { getRates: async () => ({}) },
  };

  return { deps, subscriptions, categories, phases, users, writes };
};

// @subeye/store has no `userId` on any record — the ~15 ownership checks the
// services used to carry did not move with the logic, they were replaced by
// this. If `createPorts` leaks, every user reads and writes every other user's
// subscriptions, and nothing else in the suite would notice.
describe("the ports are scoped to the authenticated user", () => {
  it("hides another user's subscriptions from every read", async () => {
    const { deps } = fakeDeps();
    const intruder = createPorts(INTRUDER, deps);

    expect(await intruder.subscriptions.all()).toEqual([]);
    expect(await intruder.subscriptions.byId("sub_a")).toBeNull();
    expect(await intruder.phases.all()).toEqual([]);
    expect(await intruder.phases.bySubscription("sub_a")).toEqual([]);
    expect(await intruder.categories.all()).toEqual([]);
    expect(await intruder.categories.byId("cat_a")).toBeNull();

    // `findById` itself does not filter — the SQL behind it is `WHERE id = $1`.
    // The port is the only thing standing between it and the wrong tenant.
    expect(await deps.subscriptions.findById("sub_a")).not.toBeNull();
  });

  it("answers a foreign subscription with NOT FOUND through the use-cases", async () => {
    const { deps, writes } = fakeDeps();
    const intruder = createPorts(INTRUDER, deps);

    expect(await listSubscriptions(intruder)).toEqual([]);
    await expect(getSubscription(intruder, "sub_a")).rejects.toThrow(
      "Subscription not found",
    );
    await expect(
      cancelSubscription(intruder, "sub_a", "immediate"),
    ).rejects.toThrow("Subscription not found");
    await expect(
      updateSubscription(intruder, "sub_a", { name: "Stolen" }),
    ).rejects.toThrow("Subscription not found");
    await expect(deleteSubscription(intruder, "sub_a")).rejects.toThrow(
      "Subscription not found",
    );

    expect(writes).toEqual([]);
  });

  it("carries the tenant into the write even if a guard were skipped", async () => {
    const { deps, subscriptions } = fakeDeps();
    const intruder = createPorts(INTRUDER, deps);

    await expect(
      intruder.subscriptions.update("sub_a", { name: "Stolen" }),
    ).rejects.toThrow("Failed to update subscription");
    await intruder.subscriptions.remove("sub_a");
    await intruder.categories.remove("cat_a");

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0]?.name).toBe("Netflix");
  });

  it("still serves the owner", async () => {
    const { deps } = fakeDeps();
    const owner = createPorts(OWNER, deps);

    const listed = await listSubscriptions(owner);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.id).toBe("sub_a");
    expect(listed[0]?.category?.name).toBe("Streaming");
    expect(listed[0]?.upcomingPhase?.id).toBe("phase_a");
  });
});

describe("the subscription port maps the stored row", () => {
  it("hands the store ISO strings for the columns Drizzle returns as Date", async () => {
    const { deps } = fakeDeps();
    const record = await createPorts(OWNER, deps).subscriptions.byId("sub_a");

    expect(record?.willBeCancelledAt).toBe("2026-12-01T00:00:00.000Z");
    expect(record?.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("leaves the cancellation column alone when the patch omits it", async () => {
    const { deps, subscriptions } = fakeDeps();
    const ports = createPorts(OWNER, deps);

    await ports.subscriptions.update("sub_a", { pausedAt: null });

    // Present-and-null silently un-cancels every subscription anyone pauses or
    // resumes: neither transition touches the cancellation, so the key is
    // absent rather than null.
    expect(subscriptions[0]?.willBeCancelledAt).toEqual(
      new Date("2026-12-01T00:00:00.000Z"),
    );
  });

  it("writes null when the patch asks for it", async () => {
    const { deps, subscriptions } = fakeDeps();
    const ports = createPorts(OWNER, deps);

    await ports.subscriptions.update("sub_a", { willBeCancelledAt: null });

    expect(subscriptions[0]?.willBeCancelledAt).toBeNull();
  });
});

describe("the preferences port", () => {
  it("reads a user with no row as the defaults rather than throwing", async () => {
    const { deps } = fakeDeps();

    // Every request needs a timezone and a currency, and the row is only
    // written when the user first changes something. A throw here would take
    // out every read for a brand-new account.
    expect(await createPorts(INTRUDER, deps).preferences.read()).toEqual({
      preferredCurrency: "uah",
      preferredTimezone: "UTC",
      dateFormat: "DD/MM/YYYY",
      locale: "en",
      theme: "system",
    });
  });

  it("maps the record's names onto the column names", async () => {
    const { deps, users } = fakeDeps();

    const written = await createPorts(OWNER, deps).preferences.write({
      preferredTimezone: "Europe/Kyiv",
    });

    // The record says `preferredTimezone`; the column is `timezone`.
    expect(users[0]?.timezone).toBe("Europe/Kyiv");
    expect(written.preferredTimezone).toBe("Europe/Kyiv");
    expect(written.locale).toBe("en");
  });
});
