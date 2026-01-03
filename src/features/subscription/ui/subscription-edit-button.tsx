import * as React from "react";
import { FC } from "react";
import { Button } from "@/shared/components";
import { Edit } from "lucide-react";
import Link from "next/link";

type SubscriptionEditButtonProps = {
  subscriptionId: string;
};

export const SubscriptionEditButton: FC<SubscriptionEditButtonProps> = ({
  subscriptionId,
}) => {
  return (
    <Button variant="outline" size="icon" asChild>
      <Link href={`/subscriptions/${subscriptionId}`} passHref>
        <Edit className="size-4 transition-all" />
      </Link>
    </Button>
  );
};
