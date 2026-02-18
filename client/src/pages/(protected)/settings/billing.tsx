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
import { FREE_PLAN } from "shared";
import * as m from "@/i18n/messages";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";

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

function SettingsBillingPage() {
  const { from } = Route.useSearch();
  const { userId } = useAuth();
  const { data: usage } = useQuery(
    planUsageQuery({ params: { userId: userId! } }),
  );

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
                badge={m.settings_billing_currentPlan()}
                active
                features={FREE_PLAN.features.map((f) => ({
                  label: FEATURE_LABELS[f.key]?.() ?? f.key,
                  included: f.included,
                }))}
              />

              <p className="text-muted-foreground text-center text-sm">
                {m.settings_billing_plans_comingSoon()}
              </p>
            </CardContent>
          </Card>
        </div>
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
