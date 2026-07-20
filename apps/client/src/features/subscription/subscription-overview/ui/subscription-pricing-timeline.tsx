import type { PricePhaseKind, SubscriptionDto } from "@subeye/shared";
import type { FC } from "react";
import { CurrencyText } from "@/entities/currency";
import * as m from "@/i18n/messages";
import { cn } from "@/shared/lib/classes-utils";

type TimelineSegment = {
  id: string;
  kind: PricePhaseKind;
  cost: number;
  currencyCode: string;
  preferredAmount: number;
  startsAt: string | null;
  endsAt: string | null;
  isCurrent: boolean;
};

const phaseLabel = (kind: PricePhaseKind): string => {
  switch (kind) {
    case "trial":
      return m.subscription_timeline_phase_trial();
    case "intro":
      return m.subscription_timeline_phase_intro();
    case "scheduledChange":
      return m.subscription_timeline_phase_scheduledChange();
    default:
      return m.subscription_timeline_phase_standard();
  }
};

const phaseDotClass = (kind: PricePhaseKind): string => {
  switch (kind) {
    case "trial":
      return "bg-sky-500";
    case "intro":
      return "bg-violet-500";
    case "scheduledChange":
      return "bg-amber-500";
    default:
      return "bg-foreground/50";
  }
};

type SubscriptionPricingTimelineProps = {
  subscription: SubscriptionDto;
  formatDate: (iso: string) => string;
};

/**
 * The "money over time" ribbon — the page's signature element. Renders the
 * current price segment followed by every upcoming pricing phase so a user
 * sees, at a glance, what they pay now and exactly what changes next.
 */
export const SubscriptionPricingTimeline: FC<
  SubscriptionPricingTimelineProps
> = ({ subscription, formatDate }) => {
  const now = Date.now();
  const phases = subscription.pricePhases;

  const future = phases
    .filter((phase) => Date.parse(phase.startsAt) > now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const activeOverride = phases.find(
    (phase) =>
      phase.isActive && (phase.kind === "trial" || phase.kind === "intro"),
  );

  const heading = (
    <h2 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
      {m.subscription_timeline_title()}
    </h2>
  );

  if (!activeOverride && future.length === 0) {
    return (
      <div className="bg-card rounded-2xl border p-4">
        {heading}
        <p className="text-muted-foreground text-sm">
          {m.subscription_timeline_empty()}
        </p>
      </div>
    );
  }

  const currentSegment: TimelineSegment = activeOverride
    ? {
        id: activeOverride.id,
        kind: activeOverride.kind,
        cost: activeOverride.cost,
        currencyCode: activeOverride.billing.preferred.currencyCode,
        preferredAmount: activeOverride.billing.preferred.amount,
        startsAt: null,
        endsAt: activeOverride.endsAt,
        isCurrent: true,
      }
    : {
        id: "current",
        kind: "standard",
        cost: subscription.cost,
        currencyCode: subscription.billing.preferred.currencyCode,
        preferredAmount: subscription.billing.preferred.amount,
        startsAt: null,
        endsAt: future[0]?.startsAt ?? null,
        isCurrent: true,
      };

  const segments: TimelineSegment[] = [
    currentSegment,
    ...future.map((phase) => ({
      id: phase.id,
      kind: phase.kind,
      cost: phase.cost,
      currencyCode: phase.billing.preferred.currencyCode,
      preferredAmount: phase.billing.preferred.amount,
      startsAt: phase.startsAt,
      endsAt: phase.endsAt,
      isCurrent: false,
    })),
  ];

  return (
    <div className="bg-card rounded-2xl border p-4">
      {heading}
      <ol className="relative space-y-4">
        {segments.map((segment, index) => (
          <li key={segment.id} className="relative flex gap-3 pl-0.5">
            {index < segments.length - 1 && (
              <span
                className="bg-border absolute top-4 left-[7px] h-full w-px"
                aria-hidden
              />
            )}
            <span
              className={cn(
                "ring-card mt-1 size-3.5 shrink-0 rounded-full ring-4",
                phaseDotClass(segment.kind),
              )}
              aria-hidden
            />
            <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {phaseLabel(segment.kind)}
                </span>
                {segment.isCurrent && (
                  <span className="text-muted-foreground rounded-full border px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                    {m.subscription_timeline_now()}
                  </span>
                )}
              </div>
              <div className="text-sm font-semibold">
                {segment.kind === "trial" && segment.cost === 0 ? (
                  m.subscription_timeline_free()
                ) : (
                  <CurrencyText
                    currencyCode={segment.currencyCode}
                    amount={segment.preferredAmount}
                  />
                )}
              </div>
              <p className="text-muted-foreground w-full text-xs">
                {segment.isCurrent
                  ? segment.endsAt
                    ? m.subscription_timeline_until({
                        date: formatDate(segment.endsAt),
                      })
                    : m.subscription_timeline_ongoing()
                  : m.subscription_timeline_from({
                      date: segment.startsAt
                        ? formatDate(segment.startsAt)
                        : "",
                    })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};
