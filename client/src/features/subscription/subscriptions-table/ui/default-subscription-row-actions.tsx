import { Button, ButtonGroup } from "@/shared/components";
import { SubscriptionDto } from "shared";
import { SubscriptionDeleteButton } from "../../delete-subscription";
import { Link } from "@tanstack/react-router";
import { EyeIcon, Edit } from "lucide-react";
import * as m from "@/i18n/messages";
import { FC } from "react";

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
