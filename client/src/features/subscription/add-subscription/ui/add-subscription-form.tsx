import { useForm, SubmitHandler } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  AddSubscriptionInput,
  AddSubscriptionOutput,
  useAddSubscriptionFormSchema,
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
import { SubscriptionPeriod } from "@shared/types";
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
};

export const AddSubscriptionForm = ({
  defaultValues,
  subscriptionId,
}: SubscriptionFormProps) => {
  const schema = useAddSubscriptionFormSchema();
  const formMethods = useForm({
    resolver: valibotResolver(schema),
    defaultValues: {
      name: "",
      cost: "",
      paymentDate: new Date(),
      every: "1",
      period: SubscriptionPeriod.MONTH,
      currency: "usd",
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
  const isLimitReached =
    !isEditMode &&
    !!usage &&
    usage.subscriptions.current >= usage.subscriptions.limit;

  const onSubmit: SubmitHandler<AddSubscriptionOutput> = (data) => {
    const payload = {
      ...data,
      paymentDate: new Date(data.paymentDate).toISOString(),
      autoPaid: false,
      category: null,
      notes: null,
      brandDomain: data.brandDomain ?? null,
    };

    if (isEditMode && subscriptionId) {
      updateSubscription(
        { id: subscriptionId, payload },
        {
          async onSuccess() {
            await navigate({ to: "/subscriptions" });
            toast.success(m.messages_updated());
          },
        },
      );
    } else {
      addSubscription(payload, {
        async onSuccess() {
          await navigate({ to: "/subscriptions" });
          toast.success(m.messages_added());
        },
      });
    }
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
          <SubscriptionFormBillingInfo />
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
