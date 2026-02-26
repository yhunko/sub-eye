import * as m from "@/i18n/messages";
import { format, type Locale } from "date-fns";
import { SubscriptionPeriod } from "shared";
import { HistoryEventInsight } from "../../model/history-insights";
import {
  formatAmount,
  formatHistoryCycle,
  formatHistoryDateLabel,
  parseHistoryDate,
} from "./subscription-history-formatters";

const formatRecurringPrice = (snapshot: {
  cost?: number;
  currency?: string;
  every?: number;
  period?: SubscriptionPeriod;
}): string | null => {
  if (snapshot.cost === undefined || !snapshot.currency) {
    return null;
  }

  const amount = formatAmount(snapshot.cost, snapshot.currency);
  const cycle = formatHistoryCycle(snapshot.every, snapshot.period);

  if (!cycle) {
    return amount;
  }

  if (snapshot.every === 1 && snapshot.period === SubscriptionPeriod.MONTH) {
    return `${amount}${m.common_perMonth()}`;
  }

  if (snapshot.every === 1 && snapshot.period === SubscriptionPeriod.YEAR) {
    return `${amount}${m.common_perYear()}`;
  }

  return `${amount}/${cycle}`;
};

export const getHistoryChangeDetails = (
  event: HistoryEventInsight,
  locale: Locale,
): string[] => {
  const { record, current, previous } = event;
  const details: string[] = [];

  if (record.action === "created") {
    const currentPriceWithCycle = formatRecurringPrice(current);
    if (currentPriceWithCycle) {
      details.push(
        m.subscription_history_priceSet({
          cost: currentPriceWithCycle,
        }),
      );
    }

    const cycle = formatHistoryCycle(current.every, current.period);
    if (cycle) {
      details.push(m.subscription_history_createdCycle({ cycle }));
    }

    const paymentDate = formatHistoryDateLabel(current.paymentDate, locale);
    if (paymentDate) {
      details.push(
        m.subscription_history_createdPaymentDate({ date: paymentDate }),
      );
    }

    return details;
  }

  if (record.action === "updated") {
    const currentPriceWithCycle = formatRecurringPrice(current);
    const previousPriceWithCycle = formatRecurringPrice(previous);

    if (
      currentPriceWithCycle &&
      previousPriceWithCycle &&
      (current.cost !== previous.cost || current.currency !== previous.currency)
    ) {
      details.push(
        m.subscription_history_priceChanged({
          old: previousPriceWithCycle,
          new: currentPriceWithCycle,
        }),
      );
    }

    const currentCycle = formatHistoryCycle(current.every, current.period);
    const previousCycle = formatHistoryCycle(previous.every, previous.period);

    if (currentCycle && previousCycle && currentCycle !== previousCycle) {
      details.push(
        m.subscription_history_cycleChanged({
          old: previousCycle,
          new: currentCycle,
        }),
      );
    }

    const currentPaymentDate = parseHistoryDate(current.paymentDate);
    const previousPaymentDate = parseHistoryDate(previous.paymentDate);

    if (
      currentPaymentDate &&
      previousPaymentDate &&
      currentPaymentDate.getTime() !== previousPaymentDate.getTime()
    ) {
      details.push(
        m.subscription_history_paymentDateChanged({
          old: format(previousPaymentDate, "d MMM yyyy, HH:mm", { locale }),
          new: format(currentPaymentDate, "d MMM yyyy, HH:mm", { locale }),
        }),
      );
    }

    const currentCancellationDate = parseHistoryDate(current.willBeCancelledAt);
    const previousCancellationDate = parseHistoryDate(
      previous.willBeCancelledAt,
    );

    if (!previousCancellationDate && currentCancellationDate) {
      details.push(
        m.subscription_history_cancelDateSet({
          date: format(currentCancellationDate, "d MMM yyyy, HH:mm", {
            locale,
          }),
        }),
      );
    } else if (previousCancellationDate && !currentCancellationDate) {
      details.push(m.subscription_history_cancelDateCleared());
    } else if (
      previousCancellationDate &&
      currentCancellationDate &&
      previousCancellationDate.getTime() !== currentCancellationDate.getTime()
    ) {
      details.push(
        m.subscription_history_cancelDateChanged({
          old: format(previousCancellationDate, "d MMM yyyy, HH:mm", {
            locale,
          }),
          new: format(currentCancellationDate, "d MMM yyyy, HH:mm", { locale }),
        }),
      );
    }

    if (
      previous.autoPaid !== undefined &&
      current.autoPaid !== undefined &&
      previous.autoPaid !== current.autoPaid
    ) {
      details.push(
        current.autoPaid
          ? m.subscription_history_autopayEnabled()
          : m.subscription_history_autopayDisabled(),
      );
    }

    if (details.length === 0) {
      details.push(m.subscription_history_updatedGeneral());
    }

    return details;
  }

  if (record.action === "cancelled") {
    const cancelledAt = formatHistoryDateLabel(
      current.willBeCancelledAt,
      locale,
    );

    if (cancelledAt) {
      details.push(m.subscription_history_cancelledOn({ date: cancelledAt }));
    } else {
      details.push(m.subscription_history_cancelled_generic());
    }

    return details;
  }

  if (record.action === "renewed") {
    const renewedAt = formatHistoryDateLabel(current.paymentDate, locale);

    if (renewedAt) {
      details.push(m.subscription_history_renewedOn({ date: renewedAt }));
    } else {
      details.push(m.subscription_history_renewed_generic());
    }

    return details;
  }

  if (record.action === "uncancelled") {
    details.push(m.subscription_history_uncancelled_detail());
    return details;
  }

  if (record.action === "deleted") {
    details.push(m.subscription_history_deleted_detail());
    return details;
  }

  return details;
};
