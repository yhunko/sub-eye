"use client";

import { SubscriptionForm } from "./subscription-form";
import { useSubscription } from "@/entities/subscription";
import {
  Empty,
  Spinner,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/components";
import { AddSubscriptionInput } from "../model/schema";
import { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";
import { MessageCircleWarningIcon } from "lucide-react";

type EditSubscriptionFormProps = {
  subscriptionId: string;
};

export const EditSubscriptionForm = ({
  subscriptionId,
}: EditSubscriptionFormProps) => {
  const {
    data: subscription,
    isLoading,
    error,
  } = useSubscription({
    params: {
      id: subscriptionId,
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error || !subscription) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <MessageCircleWarningIcon />
          </EmptyMedia>
          <EmptyTitle>Error loading subscription</EmptyTitle>
          <EmptyDescription>
            An error occurred while loading subscription. Please try again
            later.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Convert subscription data to form default values
  const defaultValues: Partial<AddSubscriptionInput> = {
    name: subscription.name,
    cost: subscription.cost,
    paymentDate: new Date(subscription.paymentDate),
    every: subscription.every.toString(),
    period: subscription.period,
    currency: subscription.currency,
    brandDomain: subscription.brandDomain
      ? ({
          domain: subscription.brandDomain,
        } as BrandfetchSearchDto)
      : undefined,
  };

  return (
    <SubscriptionForm
      defaultValues={defaultValues}
      subscriptionId={subscriptionId}
    />
  );
};
