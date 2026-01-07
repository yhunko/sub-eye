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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("subscription.overview");
  const tCommon = useTranslations("common.actions");

  const tDate = useTranslations("subscription.date");

  const displayState = useMemo(() => {
    if (!subscription || !isLoaded) return null;

    const timezone = user?.publicMetadata?.preferredTimezone as
      | string
      | undefined;
    const zonedDate = DateTimezoneUtils.toZoned(
      subscription.nextPaymentDate,
      timezone,
    );

    return SubscriptionUIMapper.toDisplayState(zonedDate, timezone, tDate);
  }, [subscription, isLoaded, user?.publicMetadata?.preferredTimezone, tDate]);

  const handleDeleteSuccess = () => {
    router.push("/subscriptions");
  };

  const tSub = useTranslations("subscription");

  const handleMarkAsCanceled = () => {
    // TODO: Implement mark as canceled functionality
    toast.info(tSub("messages.markAsCanceledComingSoon"));
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
            <span className="sr-only">{tCommon("back")}</span>
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
          <Button variant="outline" size="icon" asChild>
            <Link href={`/subscriptions/${subscription.id}/edit`}>
              <PencilIcon />
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
            <ItemTitle>{t("nextPayment")}</ItemTitle>
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
              <ItemTitle>{t("previousPayment")}</ItemTitle>
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
          {t("markAsCanceled")}
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
