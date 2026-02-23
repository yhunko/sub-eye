import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components";
import { SettingsFormLayout, SettingsLayout } from "@/widgets/settings-layout";
import {
  PlanCard,
  SubscriptionUsageCard,
  planUsageQuery,
} from "@/entities/billing";
import { FREE_PLAN, PRO_PLAN, type BillingFeatureKey } from "shared";
import * as m from "@/i18n/messages";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";

export const Route = createFileRoute("/(protected)/settings/billing")({
  component: SettingsBillingPage,
  validateSearch: valibotValidator(settingsSearchSchema),
});

const FEATURE_LABELS: Record<string, () => string> = {
  subscriptions: m.settings_billing_plans_free_features_subscriptions,
  analytics: m.settings_billing_plans_free_features_analytics,
  notifications: m.settings_billing_plans_free_features_notifications,
  currency: m.settings_billing_plans_free_features_currency,
};

const PRO_ADDITIONAL_FEATURE_LABELS: Partial<
  Record<BillingFeatureKey, () => string>
> = {
  notificationSchedule:
    m.settings_billing_plans_pro_features_notificationSchedule,
};

function SettingsBillingPage() {
  const { from } = Route.useSearch();
  const { userId } = useAuth();
  const { data: usage } = useQuery(
    planUsageQuery({ params: { userId: userId! } }),
  );
  const freeFeatures = FREE_PLAN.features
    .filter((feature) => feature.included)
    .map((feature) => ({
      label: FEATURE_LABELS[feature.key]?.() ?? feature.key,
      included: true,
    }));
  const proCapabilityFeatures = PRO_PLAN.features
    .filter((feature) => {
      if (!feature.included) {
        return false;
      }

      const freeFeature = FREE_PLAN.features.find((f) => f.key === feature.key);
      return !freeFeature?.included;
    })
    .map((feature) => ({
      label:
        PRO_ADDITIONAL_FEATURE_LABELS[feature.key]?.() ??
        FEATURE_LABELS[feature.key]?.() ??
        feature.key,
      included: true,
    }));
  const proAdditionalFeatures = [
    {
      label: m.settings_billing_plans_pro_features_subscriptionLimitIncrease({
        free: String(FREE_PLAN.limits.maxSubscriptions),
        pro: String(PRO_PLAN.limits.maxSubscriptions),
      }),
      included: true,
    },
    ...proCapabilityFeatures,
  ];

  return (
    <SettingsLayout
      title={m.settings_billing_title()}
      backTo="/settings"
      backToSearch={{ from }}
    >
      <SettingsFormLayout>
        <div className="flex w-full flex-col gap-4">
          {usage && <SubscriptionUsageCard usage={usage} />}

          <Card>
            <CardHeader>
              <CardTitle>{m.settings_billing_title()}</CardTitle>
              <CardDescription>{m.settings_billing_subtitle()}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <PlanCard
                name={m.settings_billing_plans_free_name()}
                description={m.settings_billing_plans_free_description()}
                price={m.settings_billing_plans_free_price()}
                period={m.settings_billing_plans_free_period()}
                badge={
                  usage?.planId === FREE_PLAN.id
                    ? m.settings_billing_currentPlan()
                    : undefined
                }
                active={usage?.planId === FREE_PLAN.id}
                features={freeFeatures}
              />

              <PlanCard
                name={m.settings_billing_plans_pro_name()}
                description={m.settings_billing_plans_pro_description()}
                price={m.settings_billing_plans_pro_price()}
                period={m.settings_billing_plans_pro_period()}
                badge={m.settings_billing_plans_pro_badge()}
                active={usage?.planId === PRO_PLAN.id}
                features={proAdditionalFeatures}
                actions={
                  <Button variant="outline" disabled className="w-full">
                    {m.settings_billing_plans_comingSoon()}
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </div>
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
