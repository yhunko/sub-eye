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
import { SubscriptionDeleteButton } from "./subscription-delete-button";
import { useTranslation } from "react-i18next";
import { SubscriptionPeriod } from "@shared/types";
import { cn } from "@/shared/lib/classes-utils";
import {
  useCreateSubscription,
  useUpdateSubscription,
} from "@/entities/subscription";

type SubscriptionFormProps = {
  defaultValues?: Partial<AddSubscriptionInput>;
  subscriptionId?: string;
};

export const AddSubscriptionForm = ({
  defaultValues,
  subscriptionId,
}: SubscriptionFormProps) => {
  const { t } = useTranslation("subscription");

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
  const { mutate: addSubscription, isPending: isAddPending } =
    useCreateSubscription();
  const { mutate: updateSubscription, isPending: isEditPending } =
    useUpdateSubscription();

  const isPending = isAddPending || isEditPending;
  const isEditMode = !!subscriptionId;

  const onSubmit: SubmitHandler<AddSubscriptionOutput> = (data) => {
    const payload = {
      ...data,
      paymentDate: new Date(data.paymentDate).toISOString(),
    };

    if (isEditMode && subscriptionId) {
      updateSubscription(
        { id: subscriptionId, payload },
        {
          async onSuccess() {
            await navigate({ to: "/subscriptions" });
          },
        },
      );
      toast.success(t("messages.updated"));
    } else {
      addSubscription(payload, {
        async onSuccess() {
          await navigate({ to: "/subscriptions" });
        },
      });
      toast.success(t("messages.added"));
    }
  };

  return (
    <Form {...formMethods}>
      <form
        className="space-y-2 md:space-y-4"
        onSubmit={handleSubmit(onSubmit)}
      >
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
            className={cn(isEditMode && "justify-self-end")}
          >
            {isPending && <Spinner />}
            {isEditMode ? t("form.buttons.update") : t("form.buttons.add")}
          </Button>
        </div>
      </form>
    </Form>
  );
};
