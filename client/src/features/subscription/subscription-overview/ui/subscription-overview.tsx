import { FC, useMemo } from "react";
import { Link, useRouter, useNavigate } from "@tanstack/react-router";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  ChevronLeft,
  XCircle,
  PencilIcon,
  CalendarClock,
  CalendarSync,
  RotateCw,
} from "lucide-react";
import { BrandfetchImage } from "@/features/brandfetch";
import { DateTimezoneUtils } from "@shared/utils/dateTimezoneUtils";
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
import { SubscriptionOverviewStats } from "./subscription-overview-stats";
import { format } from "date-fns";
import { SubscriptionDeleteButton } from "@/features/subscription/delete-subscription";
import * as m from "@/i18n/messages";
import { PeriodBadge } from "@/features/subscription/period";
import { useQuery } from "@tanstack/react-query";
import { subscriptionQuery } from "../../../../entities/subscription";
import { SubscriptionBillingUtils } from "../../billing/lib/subscription-billing-utils";

type SubscriptionOverviewProps = {
  subscriptionId: string;
};

export const SubscriptionOverview: FC<SubscriptionOverviewProps> = ({
  subscriptionId,
}) => {
  const router = useRouter();
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const { userId } = useAuth();

  const { data: subscription } = useQuery(
    subscriptionQuery({
      params: { id: subscriptionId, userId: userId ?? "" },
      options: { enabled: !!userId },
    }),
  );

  const displayState = useMemo(() => {
    if (!subscription || !isLoaded) return null;

    const timezone = user?.publicMetadata?.preferredTimezone as
      | string
      | undefined;

    const zonedDate = DateTimezoneUtils.toZoned(
      subscription.nextPaymentDate,
      timezone,
    );

    return SubscriptionBillingUtils.toDisplayState(zonedDate, timezone);
  }, [subscription, isLoaded, user?.publicMetadata?.preferredTimezone]);

  const handleDeleteSuccess = async () => {
    await navigate({ to: "/subscriptions" });
  };

  const handleMarkAsCanceled = () => {
    toast.info(m.subscription_overview_markAsCanceledComingSoon());
  };

  return (
    <div className="flex flex-col gap-6">
      {subscription && (
        <div className="flex items-start justify-between text-center md:items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.history.back()}
            className="h-10 w-10 rounded-full"
            aria-label={m.subscription_overview_back()}
          >
            <ChevronLeft className="size-5" />
            <span className="sr-only">{m.subscription_overview_back()}</span>
          </Button>
          <div className="flex flex-1 flex-col items-center gap-4 md:flex-row md:justify-center">
            <BrandfetchImage
              domain={subscription.brandDomain ?? undefined}
              className="size-16 md:size-20"
            />
            <div className="flex flex-col">
              <h1 className="text-2xl font-semibold md:text-3xl">
                {subscription.name}
              </h1>
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            asChild
            aria-label={m.subscription_overview_edit({
              name: subscription.name,
            })}
          >
            <Link to="/subscriptions/$id/edit" params={{ id: subscription.id }}>
              <PencilIcon />
              <span className="sr-only">
                {m.subscription_overview_edit({ name: subscription.name })}
              </span>
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
            <ItemTitle>{m.subscription_overview_nextPayment()}</ItemTitle>
            <ItemDescription className={displayState?.colorClass}>
              {displayState?.relativeText}
            </ItemDescription>
          </ItemContent>
        </Item>
        {subscription && (
          <Item variant="muted" size="sm">
            <ItemMedia variant="icon">
              <RotateCw />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{m.subscription_table_column_period()}</ItemTitle>
              <ItemDescription>
                <PeriodBadge
                  every={subscription.every}
                  period={subscription.period}
                />
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
        {subscription?.lastPaymentDate && (
          <Item variant="muted" size="sm">
            <ItemMedia variant="icon">
              <CalendarClock />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{m.subscription_overview_previousPayment()}</ItemTitle>
              <ItemDescription>
                {format(new Date(subscription.lastPaymentDate), "dd MMMM yyyy")}
              </ItemDescription>
            </ItemContent>
          </Item>
        )}
      </ItemGroup>

      <div className="flex flex-col gap-3 md:flex-row md:gap-4">
        <Button
          className="grow"
          size="lg"
          variant="outline"
          onClick={handleMarkAsCanceled}
        >
          <XCircle className="mr-2 size-4" />
          {m.subscription_overview_markAsCanceled()}
        </Button>
        <SubscriptionDeleteButton
          subscriptionId={subscriptionId}
          buttonClassName="grow"
          fullWidth
          onSuccess={handleDeleteSuccess}
          subscriptionName={subscription?.name}
        />
      </div>
    </div>
  );
};
