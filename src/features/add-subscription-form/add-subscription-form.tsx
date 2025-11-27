"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { valibotResolver } from "@hookform/resolvers/valibot";
import { AddSubscriptionSchema } from "./model/schema";
import { InferOutput } from "valibot";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  Input,
  FormMessage,
  Button,
  Spinner,
} from "@/shared/components";
import { CurrencyInput } from "../currency-input/currency-input";
import { useAddSubscription } from "@/entities/subscription";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { SubscriptionDateSelect } from "./ui/subscription-date-select";

const AddSubscriptionForm = () => {
  const formMethods = useForm({
    resolver: valibotResolver(AddSubscriptionSchema),
    defaultValues: {
      name: "",
      cost: "",
      nextPaymentDate: new Date(),
      every: 1,
      period: "month",
    },
  });
  const { control, handleSubmit } = formMethods;

  const router = useRouter();
  const { mutate: addSubscription, isPending: isAddingSubscription } =
    useAddSubscription();

  const onSubmit: SubmitHandler<InferOutput<typeof AddSubscriptionSchema>> = (
    data,
  ) => {
    addSubscription(
      {
        ...data,
        currency: "UAH",
        period: "month",
      },
      {
        async onSuccess() {
          toast.success("Subscription added successfully!");
          router.replace("/");
        },
      },
    );
  };

  return (
    <Form {...formMethods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="mx-auto grid max-w-screen-sm grid-cols-2 gap-2 md:gap-4"
      >
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem className="col-span-full md:col-span-1">
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Subscription name..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="cost"
          render={({ field }) => (
            <FormItem className="col-span-full md:col-span-1">
              <FormLabel>Cost</FormLabel>
              <FormControl>
                <CurrencyInput InputProps={field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="nextPaymentDate"
          render={({ field }) => (
            <FormItem className="col-span-full md:col-span-full">
              <FormLabel>Next Payment Date</FormLabel>
              <FormControl>
                <SubscriptionDateSelect
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="col-span-full flex justify-end">
          <Button type="submit" disabled={isAddingSubscription}>
            {isAddingSubscription && <Spinner />}
            Add subscription
          </Button>
        </div>
      </form>
    </Form>
  );
};
export default AddSubscriptionForm;
