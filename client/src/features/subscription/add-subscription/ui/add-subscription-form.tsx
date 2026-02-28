import { useCallback, useMemo } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  AddSubscriptionInput,
  AddSubscriptionOutput,
  createAddSubscriptionFormSchema,
} from "../model/schema";
import { Form, Button, Spinner } from "@/shared/components";
import { toast } from "sonner";
import { useBlocker, useNavigate, useRouter } from "@tanstack/react-router";
import { SubscriptionFormBasicInfo } from "./form/subscription-form-basic-info";
import { SubscriptionFormBillingInfo } from "./form/subscription-form-billing-info";
import { SubscriptionDeleteButton } from "@/features/subscription/delete-subscription";
import type { SubscriptionLifecycleStatus } from "shared";
import { SubscriptionPeriod } from "shared";
import { cn } from "@/shared/lib/classes-utils";
import {
  useCreateSubscription,
  useUpdateSubscription,
} from "@/entities/subscription";
import { SubscriptionLimitAlert, planUsageQuery } from "@/entities/billing";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import NiceModal from "@ebay/nice-modal-react";
import * as m from "@/i18n/messages";

type SubscriptionFormProps = {
  defaultValues?: Partial<AddSubscriptionInput>;
  subscriptionId?: string;
  subscriptionStatus?: SubscriptionLifecycleStatus;
};

export const AddSubscriptionForm = ({
  defaultValues,
  subscriptionId,
  subscriptionStatus,
}: SubscriptionFormProps) => {
  const formMethods = useForm({
    resolver: valibotResolver(createAddSubscriptionFormSchema()),
    defaultValues: {
      name: "",
      cost: "",
      paymentDate: new Date(),
      every: "1",
      period: SubscriptionPeriod.MONTH,
      currency: "usd",
      willBeCancelledAt: null,
      ...defaultValues,
    },
  });
  const { handleSubmit, formState, reset, getValues } = formMethods;

  const navigate = useNavigate();
  const router = useRouter();
  const { userId } = useAuth();
  const { data: usage } = useQuery(
    planUsageQuery({ params: { userId: userId! } }),
  );
  const { mutate: addSubscription, isPending: isAddPending } =
    useCreateSubscription();
  const { mutate: updateSubscription, isPending: isEditPending } =
    useUpdateSubscription();

  const isPending = isAddPending || isEditPending;
  const isEditMode = !!subscriptionId;
  const showRenewalMode = isEditMode && subscriptionStatus === "cancelled";
  const isLimitReached =
    !isEditMode &&
    !!usage &&
    usage.subscriptions.current >= usage.subscriptions.limit;
  const shouldBlockNavigation = useMemo(
    () => formState.isDirty && !isPending,
    [formState.isDirty, isPending],
  );

  const showLeaveDialog = useCallback(async () => {
    const { SubscriptionFormLeaveDialog } =
      await import("./subscription-form-leave-dialog");

    const shouldDiscard = await NiceModal.show(SubscriptionFormLeaveDialog);

    return Boolean(shouldDiscard);
  }, []);

  useBlocker({
    shouldBlockFn: async () => {
      if (!shouldBlockNavigation) {
        return false;
      }

      const shouldDiscard = await showLeaveDialog();
      return !shouldDiscard;
    },
    enableBeforeUnload: () => shouldBlockNavigation,
  });

  const navigateBack = async () => {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }

    await navigate({ to: "/subscriptions" });
  };

  const onSubmit: SubmitHandler<AddSubscriptionOutput> = (data) => {
    const { willBeCancelledAt, ...rest } = data;

    const toISO = (value?: string | Date | null) =>
      value ? new Date(value).toISOString() : null;

    const cancellationDateIso =
      isEditMode && showRenewalMode ? null : toISO(willBeCancelledAt);
    const paymentDateIso =
      isEditMode && cancellationDateIso
        ? cancellationDateIso
        : toISO(rest.paymentDate)!;

    const basePayload = {
      ...rest,
      paymentDate: paymentDateIso,
      autoPaid: false,
      category: null,
      notes: null,
      brandDomain: rest.brandDomain ?? null,
    };

    const payload = {
      ...basePayload,
      willBeCancelledAt: cancellationDateIso,
    };

    const onSuccess = async (message: string) => {
      reset(getValues());
      await navigate({ to: "/subscriptions" });
      toast.success(message);
    };

    if (isEditMode && subscriptionId) {
      updateSubscription(
        { id: subscriptionId, payload },
        { onSuccess: () => onSuccess(m.messages_updated()) },
      );
      return;
    }

    addSubscription(payload, {
      onSuccess: () => onSuccess(m.messages_added()),
    });
  };

  return (
    <Form {...formMethods}>
      <form
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="border-border/70 bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-20 shrink-0 border-b px-3 py-3 md:px-6 md:py-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full px-4"
              onClick={() => {
                void navigateBack();
              }}
            >
              {m.common_actions_cancel()}
            </Button>

            <h1 className="text-center text-lg font-semibold tracking-tight md:text-2xl">
              {isEditMode
                ? m.subscription_form_title_edit()
                : m.subscription_form_title_add()}
            </h1>

            {isEditMode ? (
              <SubscriptionDeleteButton
                subscriptionId={subscriptionId}
                subscriptionName={defaultValues?.name}
                className="size-11 rounded-full"
              />
            ) : (
              <span className="size-11" aria-hidden />
            )}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-4 md:px-6 md:pt-6 md:pb-28">
          <div className="mx-auto w-full max-w-xl space-y-4">
            {isLimitReached && (
              <SubscriptionLimitAlert
                current={usage.subscriptions.current}
                limit={usage.subscriptions.limit}
              />
            )}

            <SubscriptionFormBasicInfo />
            <SubscriptionFormBillingInfo showRenewalMode={showRenewalMode} />
          </div>
        </div>

        <div className="border-border/70 bg-background/90 supports-backdrop-filter:bg-background/70 mx-auto w-full max-w-xl border-t px-4 py-3 backdrop-blur-md">
          <Button
            type="submit"
            size="lg"
            disabled={isLimitReached}
            className={cn("h-12 w-full rounded-2xl text-base")}
          >
            {isPending && <Spinner />}
            {isEditMode ? m.form_buttons_update() : m.form_buttons_add()}
          </Button>
        </div>
      </form>
    </Form>
  );
};
