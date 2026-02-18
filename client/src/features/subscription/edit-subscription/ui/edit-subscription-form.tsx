import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { MessageCircleWarningIcon } from "lucide-react";
import { AddSubscriptionForm as SubscriptionForm } from "../../add-subscription/ui/add-subscription-form";
import { subscriptionQuery } from "@/entities/subscription";
import {
  Empty,
  Spinner,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/components";
import type { AddSubscriptionInput } from "../../add-subscription/model/schema";
import type { BrandfetchSearchDto } from "@/entities/brandfetch/model/dtos";

type EditSubscriptionFormProps = {
  subscriptionId: string;
};

export const EditSubscriptionForm = ({
  subscriptionId,
}: EditSubscriptionFormProps) => {
  const { userId } = useAuth();
  const {
    data: subscription,
    isLoading,
    error,
  } = useQuery(
    subscriptionQuery({
      params: {
        id: subscriptionId,
        userId: userId ?? "",
      },
      options: { enabled: !!userId },
    }),
  );

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
    cost: String(subscription.cost),
    paymentDate: new Date(subscription.paymentDate),
    every: subscription.every.toString(),
    period: subscription.period,
    currency: subscription.currency,
    brandDomain: subscription.brandDomain
      ? ({
          domain: subscription.brandDomain,
        } as BrandfetchSearchDto)
      : undefined,
    willBeCancelledAt:
      subscription.status === "cancelledButActive" &&
      subscription.willBeCancelledAt
        ? new Date(subscription.willBeCancelledAt)
        : null,
  };

  return (
    <SubscriptionForm
      defaultValues={defaultValues}
      subscriptionId={subscriptionId}
      subscriptionStatus={subscription.status}
    />
  );
};
