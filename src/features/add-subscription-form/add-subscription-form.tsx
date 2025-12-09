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
  ToggleGroup,
  ToggleGroupItem,
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
      every: "1",
      period: "month",
    },
  });
  const { control, setValue, watch, handleSubmit } = formMethods;
  const period = watch("period");

  const router = useRouter();
  const { mutate: addSubscription, isPending: isAddingSubscription } =
    useAddSubscription();

  const onSubmit: SubmitHandler<InferOutput<typeof AddSubscriptionSchema>> = (
    data,
  ) => {
    addSubscription(
      {
        ...data,
        currency: 840,
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
            <FormItem className="col-span-full md:col-span-1">
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
        <FormField
          control={control}
          name="every"
          render={({ field }) => (
            <div className="relative">
              <div className="col-span-full flex flex-col gap-2 md:col-span-1 md:flex-row md:items-end">
                <FormItem>
                  <FormLabel>Billing cycle</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Every..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
                <ToggleGroup
                  value={period}
                  type="single"
                  variant="outline"
                  spacing={0}
                >
                  <ToggleGroupItem
                    value="week"
                    aria-label="Toggle bold"
                    onClick={() => setValue("period", "week")}
                  >
                    Week
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="month"
                    aria-label="Toggle italic"
                    onClick={() => setValue("period", "month")}
                  >
                    Month
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="year"
                    aria-label="Toggle strikethrough"
                    onClick={() => setValue("period", "year")}
                  >
                    Year
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <span className="text-muted-foreground absolute bottom-0 translate-y-full text-sm">
                What is the cycle? For example: every 1 month
              </span>
            </div>
          )}
        />

        <div className="col-span-full mt-4 flex justify-end">
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
