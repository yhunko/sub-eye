import type { FC } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
} from "@/shared/components";
import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import * as m from "@/i18n/messages";

type SubscriptionLimitAlertProps = {
  current: number;
  limit: number;
};

export const SubscriptionLimitAlert: FC<SubscriptionLimitAlertProps> = ({
  current,
  limit,
}) => {
  return (
    <Alert variant="destructive">
      <TriangleAlert />
      <AlertTitle>{m.billing_limitReached_title()}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3">
        <p>
          {m.billing_limitReached_description({
            current: String(current),
            limit: String(limit),
          })}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/settings/billing">{m.billing_limitReached_action()}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};
