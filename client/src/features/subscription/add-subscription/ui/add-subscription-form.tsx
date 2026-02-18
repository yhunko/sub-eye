import { useForm, SubmitHandler } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  AddSubscriptionInput,
  AddSubscriptionOutput,
  createAddSubscriptionFormSchema,
} from "../model/schema";
import {
  Form,
  Button,
  FieldSeparator,
  FieldGroup,
  Spinner,
} from "@/shared/components";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
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
  const { handleSubmit } = formMethods;

  const navigate = useNavigate();
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

  const onSubmit: SubmitHandler<AddSubscriptionOutput> = (data) => {
    const { willBeCancelledAt, ...rest } = data;

    const toISO = (value?: string | Date | null) =>
      value ? new Date(value).toISOString() : null;

    const basePayload = {
      ...rest,
      paymentDate: toISO(rest.paymentDate)!,
      autoPaid: false,
      category: null,
      notes: null,
      brandDomain: rest.brandDomain ?? null,
    };

    const payload = {
      ...basePayload,
      willBeCancelledAt:
        isEditMode && showRenewalMode ? null : toISO(willBeCancelledAt),
    };

    const onSuccess = async (message: string) => {
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
        className="space-y-2 md:space-y-4"
        onSubmit={handleSubmit(onSubmit)}
      >
        {isLimitReached && (
          <SubscriptionLimitAlert
            current={usage.subscriptions.current}
            limit={usage.subscriptions.limit}
          />
        )}

        <FieldGroup className="md:grid-cols-1">
          <SubscriptionFormBasicInfo />
          <FieldSeparator />
          <SubscriptionFormBillingInfo showRenewalMode={showRenewalMode} />
        </FieldGroup>

        <div className="col-span-full flex justify-between">
          {isEditMode && (
            <SubscriptionDeleteButton
              subscriptionId={subscriptionId}
              subscriptionName={defaultValues?.name}
            />
          )}

          <Button
            type="submit"
            disabled={isLimitReached}
            className={cn(isEditMode && "justify-self-end")}
          >
            {isPending && <Spinner />}
            {isEditMode ? m.form_buttons_update() : m.form_buttons_add()}
          </Button>
        </div>
      </form>
    </Form>
  );
};
