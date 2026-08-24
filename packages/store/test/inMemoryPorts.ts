import type {
  CategoryRecord,
  Ports,
  PreferencesRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "../src";

type Dump = {
  subscriptions: SubscriptionRecord[];
  categories: CategoryRecord[];
  phases: PricePhaseRecord[];
};

/**
 * A full Ports implementation over plain arrays. Every use-case test drives
 * this instead of a hand-rolled per-test fake, so a use-case that forgets to
 * write is caught by reading `dump()` back rather than by asserting a spy was
 * called.
 */
export function inMemoryPorts(seed?: {
  subscriptions?: SubscriptionRecord[];
  categories?: CategoryRecord[];
  phases?: PricePhaseRecord[];
  preferences?: Partial<PreferencesRecord>;
  rates?: Record<string, number>;
  now?: Date;
}): Ports & { dump: () => Dump } {
  const subscriptions = [...(seed?.subscriptions ?? [])];
  const categories = [...(seed?.categories ?? [])];
  const phases = [...(seed?.phases ?? [])];
  let preferences: PreferencesRecord = {
    preferredCurrency: "uah",
    preferredTimezone: "UTC",
    dateFormat: "DD/MM/YYYY",
    locale: "en",
    theme: "system",
    ...seed?.preferences,
  };
  let idCounter = 0;

  return {
    now: () => seed?.now ?? new Date("2026-08-24T00:00:00.000Z"),
    newId: () => `id-${++idCounter}`,
    rates: { forBase: async () => seed?.rates ?? {} },
    preferences: {
      read: async () => preferences,
      write: async (patch) => {
        preferences = { ...preferences, ...patch };
        return preferences;
      },
    },
    subscriptions: {
      all: async () => [...subscriptions],
      byId: async (id) => subscriptions.find((s) => s.id === id) ?? null,
      create: async (record) => {
        subscriptions.push(record);
        return record;
      },
      update: async (id, patch) => {
        const index = subscriptions.findIndex((s) => s.id === id);
        if (index === -1) throw new Error(`no subscription ${id}`);
        const next = { ...subscriptions[index]!, ...patch };
        subscriptions[index] = next;
        return next;
      },
      remove: async (id) => {
        const index = subscriptions.findIndex((s) => s.id === id);
        if (index !== -1) subscriptions.splice(index, 1);
        // Cascade, which Postgres did with ON DELETE CASCADE. Without it a
        // delete test passes against a store that leaked orphan phases.
        for (let i = phases.length - 1; i >= 0; i--) {
          if (phases[i]!.subscriptionId === id) phases.splice(i, 1);
        }
      },
    },
    categories: {
      all: async () => [...categories],
      byId: async (id) => categories.find((c) => c.id === id) ?? null,
      create: async (record) => {
        categories.push(record);
        return record;
      },
      update: async (id, patch) => {
        const index = categories.findIndex((c) => c.id === id);
        if (index === -1) throw new Error(`no category ${id}`);
        const next = { ...categories[index]!, ...patch };
        categories[index] = next;
        return next;
      },
      remove: async (id) => {
        const index = categories.findIndex((c) => c.id === id);
        if (index !== -1) categories.splice(index, 1);
        // ON DELETE SET NULL. The delete-confirmation copy in the app counts
        // exactly these rows, so they must survive the category.
        for (const s of subscriptions)
          if (s.categoryId === id) s.categoryId = null;
      },
    },
    phases: {
      bySubscription: async (subscriptionId) =>
        phases.filter((p) => p.subscriptionId === subscriptionId),
      replaceAll: async (subscriptionId, records) => {
        for (let i = phases.length - 1; i >= 0; i--) {
          if (phases[i]!.subscriptionId === subscriptionId) phases.splice(i, 1);
        }
        phases.push(...records);
      },
      applyBoundary: async (args) => {
        const phase = phases.find((p) => p.id === args.phaseId);
        if (phase) {
          phase.appliedAt = args.appliedAt;
          phase.startsAt = args.startsAt;
        }
        if (args.precedingPhaseId) {
          const preceding = phases.find((p) => p.id === args.precedingPhaseId);
          if (preceding) preceding.endsAt = args.startsAt;
        }
        const subscription = subscriptions.find(
          (s) => s.id === args.subscriptionId,
        );
        if (subscription) {
          subscription.cost = args.cost;
          subscription.currency = args.currency;
        }
      },
      remove: async (id) => {
        const index = phases.findIndex((p) => p.id === id);
        if (index !== -1) phases.splice(index, 1);
      },
    },
    dump: () => ({
      subscriptions: [...subscriptions],
      categories: [...categories],
      phases: [...phases],
    }),
  };
}
