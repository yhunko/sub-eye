"use client";

import { useForm } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  AddSubscriptionInput,
  AddSubscriptionOutput,
  useAddSubscriptionFormSchema,
} from "../model/schema";
import {
  Form,
  Button,
  Spinner,
  FieldSeparator,
  FieldGroup,
} from "@/shared/components";
import {
  useAddSubscription,
  useUpdateSubscription,
} from "@/entities/subscription";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Period } from "@/shared/lib/db";
import { SubscriptionFormBasicInfo } from "./form/subscription-form-basic-info";
import { SubscriptionFormBillingInfo } from "./form/subscription-form-billing-info";
import { SubscriptionDeleteButton } from "./subscription-delete-button";
import { cn } from "@/shared/lib";
import { useTranslations } from "next-intl";

type SubscriptionFormProps = {
  defaultValues?: Partial<AddSubscriptionInput>;
  subscriptionId?: string;
};

export const SubscriptionForm = ({
  defaultValues,
  subscriptionId,
}: SubscriptionFormProps) => {
  const t = useTranslations("subscription");

  const schema = useAddSubscriptionFormSchema();
  const formMethods = useForm({
    resolver: valibotResolver(schema),
    defaultValues: {
      name: "",
      cost: "",
      paymentDate: new Date(),
      every: "1",
      period: Period.MONTH,
      currency: 840,
      ...defaultValues,
    },
  });
  const { handleSubmit } = formMethods;

  const router = useRouter();
  const { mutate: addSubscription, isPending: isAddingSubscription } =
    useAddSubscription();
  const { mutate: updateSubscription, isPending: isUpdatingSubscription } =
    useUpdateSubscription();

  const isPending = isAddingSubscription || isUpdatingSubscription;
  const isEditMode = !!subscriptionId;

  const onSubmit = (data: AddSubscriptionOutput) => {
    if (isEditMode && subscriptionId) {
      updateSubscription(
        { id: subscriptionId, params: data },
        {
          onSuccess() {
            toast.success(t("messages.updated"));
            router.push("/subscriptions");
          },
        },
      );
    } else {
      addSubscription(data, {
        onSuccess() {
          toast.success(t("messages.added"));
          router.push("/subscriptions");
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
        <FieldGroup>
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
            disabled={isPending}
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
