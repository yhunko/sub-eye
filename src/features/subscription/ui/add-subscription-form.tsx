"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { AddSubscriptionSchema } from "../model/schema";
import { InferOutput } from "valibot";
import {
  Form,
  Button,
  Spinner,
  FieldSeparator,
  FieldGroup,
} from "@/shared/components";
import { useAddSubscription } from "@/entities/subscription";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Period } from "@/shared/lib/db";
import { SubscriptionFormBasicInfo } from "./subscription-form-basic-info";
import { SubscriptionFormBillingInfo } from "./subscription-form-billing-info";

export const AddSubscriptionForm = () => {
  const formMethods = useForm({
    resolver: valibotResolver(AddSubscriptionSchema),
    defaultValues: {
      name: "",
      cost: "",
      paymentDate: new Date(),
      every: "1",
      period: Period.MONTH,
      currency: 840,
    },
  });
  const { handleSubmit } = formMethods;

  const router = useRouter();
  const { mutate: addSubscription, isPending: isAddingSubscription } =
    useAddSubscription();

  const onSubmit: SubmitHandler<InferOutput<typeof AddSubscriptionSchema>> = (
    data,
  ) => {
    addSubscription(data, {
      async onSuccess() {
        toast.success("Subscription added successfully!");
        router.replace("/");
      },
    });
  };

  return (
    <Form {...formMethods}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup>
          <SubscriptionFormBasicInfo />
          <FieldSeparator />
          <SubscriptionFormBillingInfo />
        </FieldGroup>

        <div className="col-span-full mt-8 flex justify-end md:mt-5">
          <Button type="submit" disabled={isAddingSubscription}>
            {isAddingSubscription && <Spinner />}
            Add subscription
          </Button>
        </div>
      </form>
    </Form>
  );
};
