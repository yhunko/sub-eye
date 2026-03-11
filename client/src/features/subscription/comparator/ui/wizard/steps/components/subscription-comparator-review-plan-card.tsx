import type { FC } from "react";
import { CurrencyUtils } from "shared";
import { BadgeCheck, Sparkles } from "lucide-react";
import { Badge } from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import * as m from "@/i18n/messages";
import type {
  PlanStatusTone,
  PlanVisualState,
} from "../../../../model/comparator-review-recommendation";
import type { PlanPreview } from "../../subscription-comparator-wizard.types";

type SubscriptionComparatorReviewPlanCardProps = {
  title: string;
  preview: PlanPreview;
  statusTone?: PlanStatusTone;
  state: PlanVisualState;
};

const getPlanStatusCopy = (tone: PlanStatusTone) => {
  switch (tone) {
    case "recommended":
      return m.comparator_review_badge_recommended();
    case "higher-cost":
      return m.comparator_review_badge_higher_cost();
    case "keep":
      return m.comparator_review_badge_keep_current();
    case "same-cost":
      return m.comparator_review_badge_same_cost();
  }
};

const getPlanCardClasses = (state: PlanVisualState) =>
  cn(
    "relative overflow-hidden rounded-2xl border p-4 transition-colors",
    state === "recommended" &&
      "border-emerald-500/60 bg-emerald-500/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
    state === "muted" && "border-border/70 bg-muted/20",
    state === "neutral" && "border-amber-500/40 bg-amber-500/[0.06]",
    state === "default" && "bg-muted/30",
  );

export const SubscriptionComparatorReviewPlanCard: FC<
  SubscriptionComparatorReviewPlanCardProps
> = ({ title, preview, statusTone, state }) => (
  <div className={getPlanCardClasses(state)}>
    {(state === "recommended" || state === "neutral") && (
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-10 top-0 h-20 rounded-full blur-3xl",
          state === "recommended" ? "bg-emerald-400/20" : "bg-amber-300/10",
        )}
      />
    )}

    <div className="relative flex items-start justify-between gap-3">
      <div>
        <p className="text-muted-foreground text-xs uppercase">{title}</p>
        <p className="mt-1 text-base font-semibold">{preview.name}</p>
        <p className="text-muted-foreground mt-1 text-xs">
          {preview.cycleLabel ?? m.comparator_review_incomplete()}
        </p>
      </div>

      <div className="flex max-w-[58%] flex-wrap justify-end gap-1.5">
        {statusTone ? (
          <Badge
            variant="outline"
            className={cn(
              "h-6 rounded-full border px-2.5 text-[11px] font-semibold",
              statusTone === "recommended" &&
                "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
              statusTone === "higher-cost" &&
                "border-rose-400/35 bg-rose-500/10 text-rose-200",
              statusTone === "keep" &&
                "border-sky-400/35 bg-sky-500/10 text-sky-200",
              statusTone === "same-cost" &&
                "border-amber-400/35 bg-amber-500/10 text-amber-100",
            )}
          >
            {statusTone === "recommended" || statusTone === "keep" ? (
              <BadgeCheck aria-hidden className="size-3.5" />
            ) : (
              <Sparkles aria-hidden className="size-3.5" />
            )}
            {getPlanStatusCopy(statusTone)}
          </Badge>
        ) : null}
      </div>
    </div>

    <div className="relative mt-4 grid grid-cols-3 gap-3">
      <div>
        <p className="text-muted-foreground text-[10px] uppercase">
          {m.comparator_review_metric_charge()}
        </p>
        <p className="mt-1 text-xs font-medium">
          {preview.immediateCharge === null
            ? m.comparator_review_incomplete()
            : CurrencyUtils.formatAmount(
                preview.immediateCharge,
                preview.currencyCode,
              )}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-[10px] uppercase">
          {m.comparator_review_metric_monthly()}
        </p>
        <p className="mt-1 text-xs font-medium">
          {preview.monthlyAmount === null
            ? m.comparator_review_incomplete()
            : CurrencyUtils.formatAmount(
                preview.monthlyAmount,
                preview.currencyCode,
              )}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-[10px] uppercase">
          {m.comparator_review_metric_yearly()}
        </p>
        <p className="mt-1 text-xs font-medium">
          {preview.yearlyAmount === null
            ? m.comparator_review_incomplete()
            : CurrencyUtils.formatAmount(
                preview.yearlyAmount,
                preview.currencyCode,
              )}
        </p>
      </div>
    </div>
  </div>
);
