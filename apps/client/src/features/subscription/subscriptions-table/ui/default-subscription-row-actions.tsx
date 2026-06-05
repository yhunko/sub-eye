import type { SubscriptionDto } from "@subeye/shared";
import { Link } from "@tanstack/react-router";
import { Edit, EyeIcon } from "lucide-react";
import type { FC } from "react";
import * as m from "@/i18n/messages";
import { Button, ButtonGroup } from "@/shared/components";
import { SubscriptionDeleteButton } from "../../delete-subscription";

export const DefaultSubscriptionRowActions: FC<{
  subscription: SubscriptionDto;
}> = ({ subscription }) => {
  return (
    <ButtonGroup
      orientation="horizontal"
      aria-label={m.subscription_table_actionsAriaLabel()}
      className="h-fit"
    >
      <Button
        variant="outline"
        size="icon"
        asChild
        aria-label={m.subscription_table_view_aria_label({
          name: subscription.name,
        })}
      >
        <Link to="/subscriptions/$id" params={{ id: subscription.id }}>
          <EyeIcon />
        </Link>
      </Button>
      <Button
        variant="outline"
        size="icon"
        asChild
        aria-label={m.subscription_table_edit_aria_label({
          name: subscription.name,
        })}
      >
        <Link to="/subscriptions/$id/edit" params={{ id: subscription.id }}>
          <Edit className="size-4 transition-all" />
        </Link>
      </Button>
      <SubscriptionDeleteButton
        subscriptionId={subscription.id}
        subscriptionName={subscription.name}
      />
    </ButtonGroup>
  );
};
