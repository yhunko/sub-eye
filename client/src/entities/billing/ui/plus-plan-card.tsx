import type { FC } from "react";
import { useCallback } from "react";
import { Button, GlowEffect, Tilt } from "@/shared/components";
import {
  PLUS_COMPARATOR_AI_MONTHLY_LIMIT,
  FREE_PLAN,
  PLUS_PLAN,
  type BillingFeatureKey,
} from "shared";
import * as m from "@/i18n/messages";
import { PlanCard } from "./plan-card";

type PlusPlanCardProps = {
  active: boolean;
  isActionPending: boolean;
  onAction: () => void | Promise<void>;
};

const GLOW_COLORS = ["#33A453", "#2E9B4D", "#5CCB77", "#1F6D35"];

const PLUS_ADDITIONAL_FEATURE_LABELS: Partial<
  Record<BillingFeatureKey, () => string>
> = {
  notificationSchedule:
    m.settings_billing_plans_pro_features_notificationSchedule,
  telegramMessageTemplate:
    m.settings_billing_plans_pro_features_telegramMessageTemplate,
  familyGroup: m.settings_billing_plans_pro_features_familyGroup,
};

export const PlusPlanCard: FC<PlusPlanCardProps> = ({
  active,
  isActionPending,
  onAction,
}) => {
  const plusCapabilityFeatures = PLUS_PLAN.features
    .filter((feature) => {
      if (!feature.included) {
        return false;
      }

      const freeFeature = FREE_PLAN.features.find((f) => f.key === feature.key);
      return !freeFeature?.included;
    })
    .map((feature) => ({
      label: PLUS_ADDITIONAL_FEATURE_LABELS[feature.key]?.() ?? feature.key,
      included: true,
    }));

  const features = [
    {
      label: m.settings_billing_plans_pro_features_subscriptionLimitIncrease({
        free: String(FREE_PLAN.limits.maxSubscriptions),
        plus: String(PLUS_PLAN.limits.maxSubscriptions),
      }),
      included: true,
    },
    {
      label: m.settings_billing_plans_pro_features_aiInsightsQuota({
        limit: String(PLUS_COMPARATOR_AI_MONTHLY_LIMIT),
      }),
      included: true,
    },
    ...plusCapabilityFeatures,
  ];

  const handleActionClick = useCallback(() => {
    void onAction();
  }, [onAction]);

  return (
    <div className="relative rounded-2xl">
      <GlowEffect
        colors={GLOW_COLORS}
        mode="colorShift"
        blur="soft"
        duration={6}
      />

      <Tilt rotationFactor={8} isReverse>
        <PlanCard
          name={m.settings_billing_plans_pro_name()}
          description={m.settings_billing_plans_pro_description()}
          price={m.settings_billing_plans_pro_price()}
          period={m.settings_billing_plans_pro_period()}
          badge={m.settings_billing_plans_pro_badge()}
          active={active}
          features={features}
          actions={
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleActionClick}
                disabled={isActionPending}
                className="w-full"
              >
                {active
                  ? m.settings_billing_plans_manageBilling()
                  : m.settings_billing_plans_upgradePlus()}
              </Button>
            </div>
          }
        />
      </Tilt>
    </div>
  );
};
