import type { RateTable } from "@subeye/money";
import type {
  CategoryRecord,
  PreferencesRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "./records";

export type SubscriptionPort = {
  all(): Promise<SubscriptionRecord[]>;
  byId(id: string): Promise<SubscriptionRecord | null>;
  create(record: SubscriptionRecord): Promise<SubscriptionRecord>;
  update(
    id: string,
    patch: Partial<SubscriptionRecord>,
  ): Promise<SubscriptionRecord>;
  /** Removing a subscription removes its price phases with it. */
  remove(id: string): Promise<void>;
};

export type CategoryPort = {
  all(): Promise<CategoryRecord[]>;
  byId(id: string): Promise<CategoryRecord | null>;
  create(record: CategoryRecord): Promise<CategoryRecord>;
  update(id: string, patch: Partial<CategoryRecord>): Promise<CategoryRecord>;
  /** Subscriptions in the removed category keep existing, uncategorized. */
  remove(id: string): Promise<void>;
};

export type PricePhasePort = {
  bySubscription(subscriptionId: string): Promise<PricePhaseRecord[]>;
  replaceAll(
    subscriptionId: string,
    records: PricePhaseRecord[],
  ): Promise<void>;
  /**
   * Fires a phase boundary: stamps the phase applied, closes the phase it
   * supersedes, and copies the new price onto the subscription. One call
   * because the four writes must land together — a host with transactions
   * groups them, and the price must never be live while the phase still reads
   * as pending.
   */
  applyBoundary(args: {
    subscriptionId: string;
    phaseId: string;
    precedingPhaseId: string | null;
    cost: string;
    currency: string;
    appliedAt: string;
    startsAt: string;
  }): Promise<void>;
  remove(id: string): Promise<void>;
};

export type PreferencesPort = {
  read(): Promise<PreferencesRecord>;
  write(patch: Partial<PreferencesRecord>): Promise<PreferencesRecord>;
};

export type RatesPort = { forBase(code: string): Promise<RateTable> };

/**
 * Everything a use-case is allowed to reach the outside world through. `now`
 * and `newId` are members rather than calls into globals for the same reason
 * the rest are: a use-case that reads a clock or generates an id on its own is
 * one a test cannot pin.
 */
export type Ports = {
  subscriptions: SubscriptionPort;
  categories: CategoryPort;
  phases: PricePhasePort;
  preferences: PreferencesPort;
  rates: RatesPort;
  now: () => Date;
  newId: () => string;
};
