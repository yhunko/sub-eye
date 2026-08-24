import { deriveSubscriptionStatus, getAllowedActions } from "@subeye/lifecycle";
import type { SubscriptionDto } from "@subeye/model";
import type { RateTable } from "@subeye/money";
import { buildPhaseProjection } from "@subeye/pricing";
import { SubscriptionCalculator } from "@subeye/spend";
import type {
  PreferencesRecord,
  PricePhaseRecord,
  SubscriptionRecord,
} from "./records";

/** The category, embedded on the DTO so the client renders a chip without a second request. */
export type EmbeddedCategory = { id: string; name: string; emoji: string };

export const toSubscriptionDto = (
  record: SubscriptionRecord,
  phases: PricePhaseRecord[],
  prefs: PreferencesRecord,
  rates: RateTable,
  category: EmbeddedCategory | null,
  now: Date,
): SubscriptionDto => {
  const billing = SubscriptionCalculator.calculateBillingDetails(
    record,
    prefs.preferredCurrency,
    rates,
  );
  const { nextPaymentDate, lastPaymentDate } =
    SubscriptionCalculator.calculatePaymentDates(
      record,
      prefs.preferredTimezone,
      now,
    );
  const projection = buildPhaseProjection(
    { every: record.every, period: record.period },
    phases,
    prefs.preferredCurrency,
    rates,
    now,
  );

  // Derived from the date columns on every read: the `status` column is a
  // materialized cache that the pause/cancel writes keep current, so a pause
  // whose `resumeAt` has passed, or a `cancelling` row whose
  // `willBeCancelledAt` has elapsed, still reads correctly in between.
  //
  // The timezone decides which calendar day those dates are measured against;
  // without it the transitions land on 00:00 UTC. See `deriveSubscriptionStatus`.
  const status = deriveSubscriptionStatus(
    {
      willBeCancelledAt: record.willBeCancelledAt,
      pausedAt: record.pausedAt,
      resumeAt: record.resumeAt,
    },
    now,
    prefs.preferredTimezone,
  );

  return {
    id: record.id,
    name: record.name,
    cost: Number(record.cost),
    currency: record.currency,
    every: record.every,
    period: record.period,
    paymentDate: record.paymentDate,
    autoPaid: record.autoPaid,
    categoryId: record.categoryId,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    brandDomain: record.brandDomain,
    billing,
    nextPaymentDate,
    lastPaymentDate,
    willBeCancelledAt: record.willBeCancelledAt,
    pausedAt: record.pausedAt,
    resumeAt: record.resumeAt,
    scheduledPriceChange: projection.scheduledPriceChange,
    pricePhases: projection.pricePhases,
    effectivePhaseKind: projection.effectivePhaseKind,
    upcomingPhase: projection.upcomingPhase,
    status,
    allowedActions: getAllowedActions({
      status,
      hasPendingPhase: projection.upcomingPhase !== null,
    }),
    category,
  };
};
