import type {
  CategoryRecord,
  Ports,
  PreferencesRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "@subeye/store";
import type {
  CategoryInsert,
  CategoryRecord as CategoryRow,
} from "./category/categoryRepository";
import { CategoryRepository } from "./category/categoryRepository";
import { CurrencyService } from "./currency/currencyService";
import type {
  PricePhaseInsert,
  PricePhaseRecord as PricePhaseRow,
} from "./subscription/subscriptionPricePhaseRepository";
import { SubscriptionPricePhaseRepository } from "./subscription/subscriptionPricePhaseRepository";
import type {
  SubscriptionInsert,
  SubscriptionRecord as SubscriptionRow,
} from "./subscription/subscriptionRepository";
import { SubscriptionRepository } from "./subscription/subscriptionRepository";
import { UserService } from "./user/userService";

/**
 * Everything the ports reach for, named structurally so a test can substitute
 * a fake without reimplementing a repository.
 */
export type PortDeps = {
  subscriptions: {
    findByUserId(userId: string): Promise<SubscriptionRow[]>;
    findById(id: string): Promise<SubscriptionRow | null>;
    create(data: SubscriptionInsert): Promise<SubscriptionRow>;
    update(
      id: string,
      userId: string,
      data: Partial<SubscriptionInsert>,
    ): Promise<SubscriptionRow>;
    delete(id: string, userId: string): Promise<void>;
  };
  phases: {
    findByUserId(userId: string): Promise<PricePhaseRow[]>;
    findBySubscriptionId(
      subscriptionId: string,
      userId: string,
    ): Promise<PricePhaseRow[]>;
    insertMany(rows: PricePhaseInsert[]): Promise<PricePhaseRow[]>;
    deleteMany(ids: string[], userId: string): Promise<void>;
    deleteById(id: string, userId: string): Promise<void>;
    applyBoundaryBatch(args: {
      subscriptionId: string;
      userId: string;
      cost: string;
      currency: string;
      phaseId: string;
      appliedAt: string;
      startsAt: string;
      precedingPhaseId: string | null;
    }): Promise<void>;
  };
  categories: {
    findByUserId(userId: string): Promise<CategoryRow[]>;
    findById(id: string): Promise<CategoryRow | null>;
    create(data: CategoryInsert): Promise<CategoryRow>;
    update(
      id: string,
      userId: string,
      data: Partial<CategoryInsert>,
    ): Promise<CategoryRow>;
    delete(id: string, userId: string): Promise<void>;
  };
  users: {
    getUserPreferences(userId: string): Promise<PreferencesRecord>;
    updateUserPreferences(
      userId: string,
      patch: Partial<PreferencesRecord>,
    ): Promise<PreferencesRecord>;
  };
  currency: { getRates(base: string): Promise<Record<string, number>> };
};

export const defaultPortDeps: PortDeps = {
  subscriptions: SubscriptionRepository,
  phases: SubscriptionPricePhaseRepository,
  categories: CategoryRepository,
  users: UserService,
  currency: CurrencyService,
};

/** ISO-8601, uniformly — a `numeric`-mode column and a `Date` both land here. */
const iso = (value: string | Date): string =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const isoOrNull = (value: string | Date | null): string | null =>
  value === null ? null : iso(value);

export const toSubscriptionRecord = (
  row: SubscriptionRow,
): SubscriptionRecord => ({
  id: row.id,
  name: row.name,
  cost: row.cost,
  currency: row.currency,
  every: row.every,
  period: row.period,
  status: row.status,
  autoPaid: row.autoPaid,
  categoryId: row.categoryId,
  notes: row.notes,
  brandDomain: row.brandDomain,
  paymentDate: iso(row.paymentDate),
  willBeCancelledAt: isoOrNull(row.willBeCancelledAt),
  pausedAt: isoOrNull(row.pausedAt),
  resumeAt: isoOrNull(row.resumeAt),
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

export const toPricePhaseRecord = (row: PricePhaseRow): PricePhaseRecord => ({
  id: row.id,
  subscriptionId: row.subscriptionId,
  kind: row.kind,
  cost: row.cost,
  currency: row.currency,
  startsAt: iso(row.startsAt),
  endsAt: isoOrNull(row.endsAt),
  appliedAt: isoOrNull(row.appliedAt),
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

export const toCategoryRecord = (row: CategoryRow): CategoryRecord => ({
  id: row.id,
  name: row.name,
  emoji: row.emoji,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

/**
 * The column is `cancelled_at`, it is the one Date-mode timestamp, and it is
 * keyed on PRESENCE, not on value. Collapsing this to
 * `willBeCancelledAt ? … : null` type-checks and passes every test, and
 * silently un-cancels every subscription anyone pauses or resumes: neither
 * transition touches the cancellation, so the key is absent rather than null.
 */
const toSubscriptionColumns = (
  patch: Partial<SubscriptionRecord>,
): Partial<SubscriptionInsert> => {
  const { willBeCancelledAt, createdAt, updatedAt, ...rest } = patch;

  return {
    ...rest,
    ...("willBeCancelledAt" in patch
      ? {
          willBeCancelledAt: willBeCancelledAt
            ? new Date(willBeCancelledAt)
            : null,
        }
      : {}),
    ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
    ...(updatedAt ? { updatedAt: new Date(updatedAt) } : {}),
  };
};

/**
 * The `@subeye/store` ports for ONE authenticated user.
 *
 * The store has no `userId` on any record — it is single-tenant by
 * construction — so every tenant filter this application needs lives here and
 * nowhere else. `byId` answers `null` for another user's row rather than
 * handing it over, and every write carries the tenant into its WHERE clause.
 */
export const createPorts = (
  userId: string,
  deps: PortDeps = defaultPortDeps,
): Ports => ({
  now: () => new Date(),
  newId: () => crypto.randomUUID(),

  rates: { forBase: (base) => deps.currency.getRates(base) },

  preferences: {
    read: () => deps.users.getUserPreferences(userId),
    write: (patch) => deps.users.updateUserPreferences(userId, patch),
  },

  subscriptions: {
    all: async () =>
      (await deps.subscriptions.findByUserId(userId)).map(toSubscriptionRecord),
    byId: async (id) => {
      const row = await deps.subscriptions.findById(id);
      return row && row.userId === userId ? toSubscriptionRecord(row) : null;
    },
    create: async (record) =>
      toSubscriptionRecord(
        await deps.subscriptions.create({
          ...toSubscriptionColumns(record),
          id: record.id,
          userId,
        } as SubscriptionInsert),
      ),
    update: async (id, patch) =>
      toSubscriptionRecord(
        await deps.subscriptions.update(
          id,
          userId,
          toSubscriptionColumns(patch),
        ),
      ),
    remove: (id) => deps.subscriptions.delete(id, userId),
  },

  categories: {
    all: async () =>
      (await deps.categories.findByUserId(userId)).map(toCategoryRecord),
    byId: async (id) => {
      const row = await deps.categories.findById(id);
      return row && row.userId === userId ? toCategoryRecord(row) : null;
    },
    create: async (record) =>
      toCategoryRecord(
        await deps.categories.create({
          id: record.id,
          userId,
          name: record.name,
          emoji: record.emoji,
        }),
      ),
    update: async (id, patch) =>
      toCategoryRecord(
        await deps.categories.update(id, userId, {
          name: patch.name,
          emoji: patch.emoji,
        }),
      ),
    remove: (id) => deps.categories.delete(id, userId),
  },

  phases: {
    all: async () =>
      (await deps.phases.findByUserId(userId)).map(toPricePhaseRecord),
    bySubscription: async (subscriptionId) =>
      (await deps.phases.findBySubscriptionId(subscriptionId, userId)).map(
        toPricePhaseRecord,
      ),
    /**
     * Diffed rather than truncated: an applied phase is history the timeline is
     * read against, and deleting and re-inserting it would churn a row nothing
     * asked to change.
     */
    replaceAll: async (subscriptionId, records) => {
      const existing = await deps.phases.findBySubscriptionId(
        subscriptionId,
        userId,
      );
      const keep = new Set(records.map((record) => record.id));
      const present = new Set(existing.map((row) => row.id));

      await deps.phases.deleteMany(
        existing.filter((row) => !keep.has(row.id)).map((row) => row.id),
        userId,
      );
      await deps.phases.insertMany(
        records
          .filter((record) => !present.has(record.id))
          .map((record) => ({
            id: record.id,
            subscriptionId: record.subscriptionId,
            userId,
            kind: record.kind,
            cost: record.cost,
            currency: record.currency,
            startsAt: record.startsAt,
            endsAt: record.endsAt,
            appliedAt: record.appliedAt,
            createdAt: new Date(record.createdAt),
            updatedAt: new Date(record.updatedAt),
          })),
      );
    },
    applyBoundary: (args) =>
      deps.phases.applyBoundaryBatch({ ...args, userId }),
    remove: (id) => deps.phases.deleteById(id, userId),
  },
});
