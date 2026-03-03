import { createFileRoute } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  GlowEffect,
  CardHeader,
  CardTitle,
  Tilt,
} from "@/shared/components";
import { SettingsFormLayout, SettingsLayout } from "@/widgets/settings-layout";
import {
  PlanCard,
  SubscriptionUsageCard,
  billingQueryKeys,
  getPaddle,
  planUsageQuery,
  subscribeToPaddleEvents,
  useCreateBillingCheckout,
  useCreateBillingPortal,
} from "@/entities/billing";
import { FREE_PLAN, PLUS_PLAN, type BillingFeatureKey } from "shared";
import * as m from "@/i18n/messages";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { useAuth } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

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

const PLUS_ADDITIONAL_FEATURE_LABELS: Partial<
  Record<BillingFeatureKey, () => string>
> = {
  notificationSchedule:
    m.settings_billing_plans_pro_features_notificationSchedule,
};

function SettingsBillingPage() {
  const { from } = Route.useSearch();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId! },
      options: { enabled: Boolean(userId) },
    }),
  );
  const createCheckout = useCreateBillingCheckout();
  const createPortal = useCreateBillingPortal();

  useEffect(() => {
    return subscribeToPaddleEvents((event) => {
      if (
        event.name !== "checkout.completed" &&
        event.name !== "checkout.closed"
      ) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: billingQueryKeys.usage._def,
      });
    });
  }, [queryClient]);

  const freeFeatures = FREE_PLAN.features
    .filter((feature) => feature.included)
    .map((feature) => ({
      label: FEATURE_LABELS[feature.key]?.() ?? feature.key,
      included: true,
    }));
  const plusCapabilityFeatures = PLUS_PLAN.features
    .filter((feature) => {
      if (!feature.included) {
        return false;
      }

      const freeFeature = FREE_PLAN.features.find((f) => f.key === feature.key);
      return !freeFeature?.included;
    })
    .map((feature) => ({
      label:
        PLUS_ADDITIONAL_FEATURE_LABELS[feature.key]?.() ??
        FEATURE_LABELS[feature.key]?.() ??
        feature.key,
      included: true,
    }));
  const plusAdditionalFeatures = [
    {
      label: m.settings_billing_plans_pro_features_subscriptionLimitIncrease({
        free: String(FREE_PLAN.limits.maxSubscriptions),
        plus: String(PLUS_PLAN.limits.maxSubscriptions),
      }),
      included: true,
    },
    ...plusCapabilityFeatures,
  ];

  const isPlusPlan = usage?.planId === PLUS_PLAN.id;
  const isActionPending = createCheckout.isPending || createPortal.isPending;

  const handlePlanAction = async () => {
    try {
      if (isPlusPlan) {
        const portal = await createPortal.mutateAsync();
        window.location.assign(portal.url);
        return;
      }

      const checkout = await createCheckout.mutateAsync();
      const paddle = await getPaddle();

      paddle.Checkout.open({
        transactionId: checkout.transactionId,
      });
    } catch (error) {
      console.error("Failed to process billing action", error);
      toast.error(m.messages_error());
    }
  };

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

              <div className="relative rounded-2xl">
                <GlowEffect
                  colors={["#33A453", "#2E9B4D", "#5CCB77", "#1F6D35"]}
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
                    active={isPlusPlan}
                    features={plusAdditionalFeatures}
                    actions={
                      <Button
                        variant="outline"
                        onClick={() => {
                          void handlePlanAction();
                        }}
                        disabled={isActionPending}
                        className="w-full"
                      >
                        {isPlusPlan
                          ? m.settings_billing_plans_manageBilling()
                          : m.settings_billing_plans_upgradePlus()}
                      </Button>
                    }
                  />
                </Tilt>
              </div>
            </CardContent>
          </Card>
        </div>
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
