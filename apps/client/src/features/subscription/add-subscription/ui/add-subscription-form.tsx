import { useAuth } from "@clerk/clerk-react";
import NiceModal from "@ebay/nice-modal-react";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { type SubscriptionDto, SubscriptionPeriod } from "@subeye/shared";
import { useQuery } from "@tanstack/react-query";
import { useBlocker, useNavigate, useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { useCallback, useRef } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";
import { planUsageQuery, SubscriptionLimitAlert } from "@/entities/billing";
import {
  useCreateSubscription,
  useUpdateSubscription,
} from "@/entities/subscription";
import * as m from "@/i18n/messages";
import { Button, Form, Spinner } from "@/shared/components";
import { track } from "@/shared/lib/analytics";
import { cn } from "@/shared/lib/classes-utils";
import { parsePriceInput } from "@/shared/lib/price-input";
import {
  type AddSubscriptionInput,
  type AddSubscriptionOutput,
  createAddSubscriptionFormSchema,
} from "../model/schema";
import { SubscriptionFormBasicInfo } from "./form/subscription-form-basic-info";
import { SubscriptionFormBillingInfo } from "./form/subscription-form-billing-info";
import { SubscriptionFormHeaderAction } from "./form/subscription-form-header-action";
import { SubscriptionFormStartingOffer } from "./form/subscription-form-starting-offer";

type SubscriptionFormProps = {
  defaultValues?: Partial<AddSubscriptionInput>;
  subscriptionId?: string;
  existingSubscription?: SubscriptionDto;
};

export const AddSubscriptionForm = ({
  defaultValues,
  subscriptionId,
  existingSubscription,
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
      introMode: "none",
      introCost: "",
      introEndsAt: null,
      ...defaultValues,
    },
  });
  const { handleSubmit, formState, reset, getValues } = formMethods;
  const allowSubmitRedirectRef = useRef(false);

  const navigate = useNavigate();
  const router = useRouter();
  const { userId } = useAuth();
  const { data: usage } = useQuery(
    planUsageQuery({
      params: { userId: userId ?? "" },
      options: { enabled: !!userId },
    }),
  );
  const { mutate: addSubscription, isPending: isAddPending } =
    useCreateSubscription();
  const { mutate: updateSubscription, isPending: isEditPending } =
    useUpdateSubscription();

  const isPending = isAddPending || isEditPending;
  const isEditMode = !!subscriptionId;
  const isLimitReached =
    !isEditMode &&
    !!usage &&
    usage.subscriptions.limit !== null &&
    usage.subscriptions.current >= usage.subscriptions.limit;
  const shouldBlockNavigation = formState.isDirty || isPending;

  const showLeaveDialog = useCallback(async () => {
    const { SubscriptionFormLeaveDialog } = await import(
      "./subscription-form-leave-dialog"
    );

    const shouldDiscard = await NiceModal.show(SubscriptionFormLeaveDialog);

    return Boolean(shouldDiscard);
  }, []);

  useBlocker({
    shouldBlockFn: async () => {
      if (allowSubmitRedirectRef.current) {
        return false;
      }

      if (isPending) {
        return true;
      }

      if (!formState.isDirty) {
        return false;
      }

      const shouldDiscard = await showLeaveDialog();
      return !shouldDiscard;
    },
    enableBeforeUnload: () =>
      shouldBlockNavigation && !allowSubmitRedirectRef.current,
  });

  const navigateBack = async () => {
    if (isPending) {
      return;
    }

    if (window.history.length > 1) {
      router.history.back();
      return;
    }

    await navigate({ to: "/subscriptions" });
  };

  const onSubmit: SubmitHandler<AddSubscriptionOutput> = (data) => {
    const toISO = (value?: string | Date | null) =>
      value ? new Date(value).toISOString() : null;

    const paymentDateIso = toISO(data.paymentDate)!;

    const categoryId = data.categoryId ?? null;

    if (categoryId) {
      track("category_assigned", {
        source: isEditMode ? "edit_form" : "add_form",
      });
    }

    // Form-only fields — stripped before hitting the (strict) API schema.
    const { introMode, introCost, introEndsAt, ...rest } = data;

    const basePayload = {
      ...rest,
      paymentDate: paymentDateIso,
      autoPaid: false,
      categoryId,
      notes: null,
      brandDomain: data.brandDomain ?? null,
    };

    const intro =
      introMode && introMode !== "none" && introEndsAt
        ? {
            kind: introMode,
            promoCost:
              introMode === "intro"
                ? (parsePriceInput(introCost ?? "") ?? 0)
                : 0,
            endsAt: new Date(introEndsAt).toISOString(),
          }
        : null;

    const onSuccess = (message: string) => {
      reset(getValues());
      toast.success(message);
      allowSubmitRedirectRef.current = true;
      void navigate({ to: "/subscriptions", replace: true }).catch(() => {
        allowSubmitRedirectRef.current = false;
      });
    };

    if (isEditMode && subscriptionId) {
      updateSubscription(
        {
          id: subscriptionId,
          payload: basePayload,
          trackHistory: false,
        },
        {
          onSuccess() {
            onSuccess(m.messages_updated());
          },
        },
      );
      return;
    }

    addSubscription(
      {
        ...basePayload,
        willBeCancelledAt: null,
        intro,
      },
      {
        onSuccess() {
          onSuccess(m.messages_added());
        },
      },
    );
  };

  return (
    <Form {...formMethods}>
      <form
        className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="shrink-0 px-3 py-3 md:px-6 md:py-4">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-11 rounded-full shadow-sm"
              onClick={navigateBack}
              disabled={isPending}
              aria-label={m.common_actions_cancel()}
            >
              <ChevronLeft className="size-4" aria-hidden />
              <span className="sr-only">{m.common_actions_cancel()}</span>
            </Button>

            <h1 className="text-center text-lg font-semibold tracking-tight md:text-2xl">
              {isEditMode
                ? m.subscription_form_title_edit()
                : m.subscription_form_title_add()}
            </h1>

            <SubscriptionFormHeaderAction
              isDirty={formState.isDirty}
              isPending={isPending}
              subscriptionId={subscriptionId}
              subscriptionName={defaultValues?.name}
            />
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto px-3 pt-4 md:px-6 md:pt-6",
            isEditMode ? "pb-6 md:pb-8" : "md:pb-28",
          )}
        >
          <div className="mx-auto w-full max-w-xl space-y-4">
            <fieldset
              disabled={isPending}
              className={cn("space-y-4", isPending && "pointer-events-none")}
            >
              {isLimitReached && usage?.subscriptions.limit !== null && (
                <SubscriptionLimitAlert
                  current={usage.subscriptions.current}
                  limit={usage.subscriptions.limit}
                />
              )}

              <SubscriptionFormBasicInfo
                existingSubscription={existingSubscription}
              />
              <SubscriptionFormBillingInfo />
              {!isEditMode && <SubscriptionFormStartingOffer />}
            </fieldset>
          </div>
        </div>

        {!isEditMode && (
          <div className="mx-auto w-full max-w-xl px-4 py-3">
            <Button
              type="submit"
              size="lg"
              disabled={isLimitReached || isPending}
              className={cn("h-12 w-full rounded-2xl text-base")}
            >
              {isPending && <Spinner />}
              {m.form_buttons_add()}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
};
