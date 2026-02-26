import * as m from "@/i18n/messages";
import { format, type Locale } from "date-fns";
import { HistoryEventInsight } from "../../model/history-insights";
import {
  formatAmount,
  formatHistoryCycle,
  formatHistoryDateLabel,
  parseHistoryDate,
} from "./subscription-history-formatters";

export const getHistoryChangeDetails = (
  event: HistoryEventInsight,
  locale: Locale,
): string[] => {
  const { record, current, previous } = event;
  const details: string[] = [];

  if (record.action === "created") {
    if (current.cost !== undefined && current.currency) {
      details.push(
        m.subscription_history_priceSet({
          cost: formatAmount(current.cost, current.currency),
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
    if (
      current.cost !== undefined &&
      current.currency &&
      previous.cost !== undefined &&
      previous.currency &&
      (current.cost !== previous.cost || current.currency !== previous.currency)
    ) {
      details.push(
        m.subscription_history_priceChanged({
          old: formatAmount(previous.cost, previous.currency),
          new: formatAmount(current.cost, current.currency),
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
