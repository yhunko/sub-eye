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
  PlusPlanCard,
  SubscriptionUsageCard,
  billingQueryKeys,
  getPaddle,
  planUsageQuery,
  subscribeToPaddleEvents,
  useCreateBillingCheckout,
  useCreateBillingPortal,
} from "@/entities/billing";
import { FREE_PLAN, PLUS_PLAN } from "shared";
import * as m from "@/i18n/messages";
import { valibotValidator } from "@tanstack/valibot-adapter";
import { settingsSearchSchema } from "@/shared/lib/router/settings-search";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
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
  comparator: m.settings_billing_plans_free_features_comparator,
  comparatorAiInsights: m.settings_billing_plans_free_features_aiInsights,
};

function SettingsBillingPage() {
  const { from } = Route.useSearch();
  const { userId } = useAuth();
  const { user } = useUser();
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
  const isPlusPlan = usage?.planId === PLUS_PLAN.id;
  const isActionPending = createCheckout.isPending || createPortal.isPending;
  const checkoutEmail = user?.primaryEmailAddress?.emailAddress ?? null;

  const handlePlanAction = useCallback(async () => {
    try {
      if (isPlusPlan) {
        const portal = await createPortal.mutateAsync();
        window.location.assign(portal.url);
        return;
      }

      const checkout = await createCheckout.mutateAsync();
      const paddle = await getPaddle();
      const checkoutOptions: {
        transactionId: string;
        customer?: {
          email: string;
        };
        settings?: {
          allowLogout: boolean;
        };
      } = {
        transactionId: checkout.transactionId,
      };

      if (checkoutEmail) {
        checkoutOptions.customer = {
          email: checkoutEmail,
        };
        checkoutOptions.settings = {
          allowLogout: true,
        };
      }

      paddle.Checkout.open(checkoutOptions);
    } catch (error) {
      console.error("Failed to process billing action", error);
      toast.error(error instanceof Error ? error.message : m.messages_error());
    }
  }, [checkoutEmail, createCheckout, createPortal, isPlusPlan]);

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

              <PlusPlanCard
                active={isPlusPlan}
                isActionPending={isActionPending}
                onAction={handlePlanAction}
              />
            </CardContent>
          </Card>
        </div>
      </SettingsFormLayout>
    </SettingsLayout>
  );
}
