import type { SubscriptionBillingDetails } from "./subscriptionBillingSchemas";

/**
 * A subscription's price over time is a schedule of ordered phases:
 * - `trial` — an initial window (usually cost 0) that ends on a date.
 * - `intro` — a reduced price for a fixed window, then reverts.
 * - `scheduledChange` — the next standard price replacing the current one.
 * - `standard` — the open-ended price the user pays once specials end.
 *
 * The subscription row's `cost`/`currency` always reflect "what you pay right
 * now"; phases only describe the transitions/overrides around it.
 */
const pricePhaseKinds = [
  "trial",
  "intro",
  "scheduledChange",
  "standard",
] as const;

export type PricePhaseKind = (typeof pricePhaseKinds)[number];

export type PricePhaseDto = {
  id: string;
  kind: PricePhaseKind;
  cost: number;
  currency: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  billing: SubscriptionBillingDetails;
};
