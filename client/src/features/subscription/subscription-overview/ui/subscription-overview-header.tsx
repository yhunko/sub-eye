import { FC } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, PencilIcon } from "lucide-react";
import { BrandfetchImage } from "@/features/brandfetch";
import { Button } from "@/shared/components";
import * as m from "@/i18n/messages";
import { SubscriptionDto } from "@shared/domains/subscription";

type SubscriptionOverviewHeaderProps = {
  subscription: SubscriptionDto;
};

export const SubscriptionOverviewHeader: FC<
  SubscriptionOverviewHeaderProps
> = ({ subscription }) => {
  const router = useRouter();

  return (
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
          domain={subscription.brandDomain}
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
  );
};
