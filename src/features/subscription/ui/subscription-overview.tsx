"use client";

import { FC, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  ChevronLeft,
  XCircle,
  PencilIcon,
  CalendarClock,
  CalendarSync,
} from "lucide-react";
import { useSubscription } from "@/entities/subscription";
import { BrandfetchImage } from "@/features/brandfetch";
import { SubscriptionUIMapper } from "../lib/subscription-ui.mapper";
import { DateTimezoneUtils } from "@/shared/lib";
import {
  Button,
  ItemGroup,
  ItemMedia,
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/shared/components";
import { toast } from "sonner";
import { SubscriptionOverviewStats } from "./overview/subscription-overview-stats";
import { format } from "date-fns";
import { SubscriptionDeleteButton } from "./subscription-delete-button";

type SubscriptionOverviewProps = {
  subscriptionId: string;
};

export const SubscriptionOverview: FC<SubscriptionOverviewProps> = ({
  subscriptionId,
}) => {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { data: subscription } = useSubscription({
    params: { id: subscriptionId },
  });

  const displayState = useMemo(() => {
    if (!subscription || !isLoaded) return null;

    const timezone = user?.publicMetadata?.preferredTimezone as
      | string
      | undefined;
    const zonedDate = DateTimezoneUtils.toZoned(
      subscription.nextPaymentDate,
      timezone,
    );

    return SubscriptionUIMapper.toDisplayState(zonedDate, timezone);
  }, [subscription, isLoaded, user?.publicMetadata?.preferredTimezone]);

  const handleDeleteSuccess = () => {
    router.push("/subscriptions");
  };

  const handleMarkAsCanceled = () => {
    // TODO: Implement mark as canceled functionality
    toast.info("Mark as canceled feature coming soon");
  };

  return (
    <div className="flex flex-col gap-6">
      {subscription && (
        <div className="flex items-start justify-between text-center md:items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 rounded-full"
          >
            <ChevronLeft className="size-5" />
            <span className="sr-only">Back</span>
          </Button>
          <div className="flex flex-1 flex-col items-center gap-4 md:flex-row md:justify-center">
            <BrandfetchImage
              domain={subscription.brandDomain}
              className="size-16 md:size-20"
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold md:text-3xl">
                {subscription.name}
              </h1>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/subscriptions/${subscription.id}/edit`}>
              <PencilIcon />
              Edit
            </Link>
          </Button>
        </div>
      )}

      <SubscriptionOverviewStats subscriptionId={subscriptionId} />

      <ItemGroup className="flex flex-col gap-2 md:gap-5">
        <Item variant="muted" size="sm">
          <ItemMedia variant="icon">
            <CalendarSync />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>Next payment</ItemTitle>
            <ItemDescription className={displayState?.colorClass}>
              {displayState?.relativeText}
            </ItemDescription>
          </ItemContent>
        </Item>
        {subscription?.lastPaymentDate && (
          <Item variant="muted" size="sm">
            <ItemMedia variant="icon">
              <CalendarClock />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Previous payment</ItemTitle>
              <ItemDescription>
                {format(subscription.lastPaymentDate, "dd MMMM yyyy")}
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
      </ItemGroup>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        <Button
          className="grow"
          size="lg"
          variant="outline"
          onClick={handleMarkAsCanceled}
        >
          <XCircle className="mr-2 size-4" />
          Mark as canceled
        </Button>
        <SubscriptionDeleteButton
          subscriptionId={subscriptionId}
          buttonClassName="grow"
          fullWidth
          onSuccess={handleDeleteSuccess}
        />
      </div>
    </div>
  );
};
