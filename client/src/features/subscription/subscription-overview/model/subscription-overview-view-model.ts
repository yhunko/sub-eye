import * as m from "@/i18n/messages";
import type { SubscriptionDto } from "shared";
import type { BillDisplayState } from "../../billing/lib/subscription-billing-utils";

type SubscriptionOverviewSummaryRow = {
  key: "summary";
  kind: "summary";
  label: string;
  value: string;
  relativeText?: string;
  relativeClassName?: string;
};

type SubscriptionOverviewPeriodRow = {
  key: "period";
  kind: "period";
  label: string;
  every: number;
  period: SubscriptionDto["period"];
};

type SubscriptionOverviewPreviousPaymentRow = {
  key: "previousPayment";
  kind: "previousPayment";
  label: string;
  value: string;
};

export type SubscriptionOverviewMetaRow =
  | SubscriptionOverviewSummaryRow
  | SubscriptionOverviewPeriodRow
  | SubscriptionOverviewPreviousPaymentRow;

export type SubscriptionOverviewViewModel = {
  metaRows: SubscriptionOverviewMetaRow[];
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function buildSubscriptionOverviewViewModel(
  subscription: SubscriptionDto,
  displayState: BillDisplayState | null,
): SubscriptionOverviewViewModel {
  const summaryLabel =
    subscription.status === "cancelled"
      ? m.subscription_details_endsOn()
      : subscription.status === "cancelledButActive"
        ? m.subscription_details_cancelsOn()
        : m.subscription_overview_nextPayment();

  const summaryRow: SubscriptionOverviewSummaryRow = {
    key: "summary",
    kind: "summary",
    label: summaryLabel,
    value: displayState?.formattedDate ?? "—",
    relativeText:
      subscription.status !== "cancelled"
        ? displayState?.relativeText
        : undefined,
    relativeClassName:
      subscription.status === "cancelledButActive"
        ? "text-amber-600 dark:text-amber-300"
        : displayState?.colorClass,
  };

  const metaRows: SubscriptionOverviewMetaRow[] = [
    summaryRow,
    {
      key: "period",
      kind: "period",
      label: m.subscription_table_column_period(),
      every: subscription.every,
      period: subscription.period,
    },
  ];

  if (subscription.lastPaymentDate) {
    metaRows.push({
      key: "previousPayment",
      kind: "previousPayment",
      label: m.subscription_overview_previousPayment(),
      value: formatDate(subscription.lastPaymentDate),
    });
  }

  return { metaRows };
}
