import { FC } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, PencilIcon } from "lucide-react";
import { BrandfetchImage } from "@/features/brandfetch";
import { Badge, Button } from "@/shared/components";
import * as m from "@/i18n/messages";
import { SubscriptionDto } from "shared";
import { cn } from "@/shared/lib/classes-utils";
import { MiddleTruncate } from "@re-dev/react-truncate";

type SubscriptionOverviewHeaderProps = {
  subscription: SubscriptionDto;
};

export const SubscriptionOverviewHeader: FC<
  SubscriptionOverviewHeaderProps
> = ({ subscription }) => {
  const router = useRouter();
  const isCancelled = subscription.status === "cancelled";
  const isCancelledButActive = subscription.status === "cancelledButActive";

  return (
    <div className="flex items-start justify-between text-center">
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
      <div className="flex flex-grow flex-col items-center gap-4">
        <BrandfetchImage
          domain={subscription.brandDomain}
          className={cn("size-16 md:size-20", isCancelled && "grayscale")}
        />
        <div className="flex w-full flex-col items-center gap-2 md:items-start">
          <div className="flex w-full flex-col items-center gap-2">
            <h1 className="w-full text-2xl font-semibold md:text-3xl">
              <MiddleTruncate className="" end={5}>
                {subscription.name}
              </MiddleTruncate>
            </h1>
            {isCancelled && (
              <Badge variant="destructive">
                {m.subscription_status_cancelled()}
              </Badge>
            )}
            {isCancelledButActive && (
              <Badge className="bg-amber-500 text-white">
                {m.subscription_status_cancelledButActive()}
              </Badge>
            )}
          </div>
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
  );
};
