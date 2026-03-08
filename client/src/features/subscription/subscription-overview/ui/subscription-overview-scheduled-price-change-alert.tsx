import { type ReactNode, useId, useState } from "react";
import { CalendarDays, ChevronDown, MoveRight } from "lucide-react";
import { LazyMotion, domAnimation, m as motion } from "motion/react";
import { CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import type { SubscriptionDto } from "shared";
import { scheduledPriceChangeAlertStyles } from "@/features/subscription/lib/scheduled-price-change-alert-styles";
import { cn } from "@/shared/lib/classes-utils";

type SubscriptionOverviewScheduledPriceChangeAlertProps = {
  subscription: SubscriptionDto;
  scheduledDateLabel: string | null;
};

type PriceComparisonRowProps = {
  currentCurrencyCode: string;
  currentAmount: number;
  scheduledCurrencyCode: string;
  scheduledAmount: number;
  unit: ReactNode;
};

const PriceComparisonRow = ({
  currentCurrencyCode,
  currentAmount,
  scheduledCurrencyCode,
  scheduledAmount,
  unit,
}: PriceComparisonRowProps) => (
  <>
    <div className={scheduledPriceChangeAlertStyles.comparisonCurrent}>
      <CurrencyText currencyCode={currentCurrencyCode} amount={currentAmount} />
      <span className={scheduledPriceChangeAlertStyles.comparisonUnit}>
        {unit}
      </span>
    </div>
    <div className="inline-flex items-center justify-center">
      <MoveRight className={scheduledPriceChangeAlertStyles.comparisonArrow} />
    </div>
    <div className={scheduledPriceChangeAlertStyles.comparisonScheduled}>
      <CurrencyText
        currencyCode={scheduledCurrencyCode}
        amount={scheduledAmount}
      />
      <span className={scheduledPriceChangeAlertStyles.comparisonUnit}>
        {unit}
      </span>
    </div>
  </>
);

export const SubscriptionOverviewScheduledPriceChangeAlert = ({
  subscription,
  scheduledDateLabel,
}: SubscriptionOverviewScheduledPriceChangeAlertProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  if (!subscription.scheduledPriceChange || !scheduledDateLabel) {
    return null;
  }

  return (
    <LazyMotion features={domAnimation}>
      <section
        className={cn("mt-3", scheduledPriceChangeAlertStyles.container)}
      >
        <button
          type="button"
          className={scheduledPriceChangeAlertStyles.headerRow}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={() => setIsExpanded((value) => !value)}
        >
          <div
            className={cn(
              scheduledPriceChangeAlertStyles.headingWrap,
              "items-center",
            )}
          >
            <span className={scheduledPriceChangeAlertStyles.iconBadge}>
              <CalendarDays className="size-4" />
            </span>
            <p className={scheduledPriceChangeAlertStyles.title}>
              {m.subscription_priceChange_overview_hint({
                date: scheduledDateLabel,
              })}
            </p>
          </div>

          <motion.span
            className={scheduledPriceChangeAlertStyles.iconButton}
            initial={false}
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </button>

        <motion.div
          id={panelId}
          className="overflow-hidden will-change-[height,opacity]"
          initial={false}
          animate={
            isExpanded
              ? { height: "auto", opacity: 1, marginTop: 8 }
              : { height: 0, opacity: 0, marginTop: 0 }
          }
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          <motion.div
            initial={false}
            animate={{ y: isExpanded ? 0 : -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={scheduledPriceChangeAlertStyles.panel}
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
              <p className={scheduledPriceChangeAlertStyles.comparisonHead}>
                {m.subscription_priceChange_overview_current()}
              </p>
              <span aria-hidden />
              <p
                className={cn(
                  "text-right",
                  scheduledPriceChangeAlertStyles.comparisonHeadAccent,
                )}
              >
                {m.subscription_priceChange_overview_from({
                  date: scheduledDateLabel,
                })}
              </p>

              <PriceComparisonRow
                currentCurrencyCode={
                  subscription.billing.preferred.currencyCode
                }
                currentAmount={subscription.billing.preferred.monthly}
                scheduledCurrencyCode={
                  subscription.scheduledPriceChange.billing.preferred
                    .currencyCode
                }
                scheduledAmount={
                  subscription.scheduledPriceChange.billing.preferred.monthly
                }
                unit={m.common_perMonth()}
              />

              <PriceComparisonRow
                currentCurrencyCode={
                  subscription.billing.preferred.currencyCode
                }
                currentAmount={subscription.billing.preferred.yearly}
                scheduledCurrencyCode={
                  subscription.scheduledPriceChange.billing.preferred
                    .currencyCode
                }
                scheduledAmount={
                  subscription.scheduledPriceChange.billing.preferred.yearly
                }
                unit={m.common_perYear()}
              />
            </div>
          </motion.div>
        </motion.div>
      </section>
    </LazyMotion>
  );
};
