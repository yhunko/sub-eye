import { FC } from "react";
import { Button } from "@/shared/components";
import { EyeIcon } from "lucide-react";

export const DemoSubscriptionRowActions: FC<{
  subscription: { id: string; name: string };
}> = () => {
  return (
    <Button variant="outline" size="icon" disabled>
      <EyeIcon className="size-4" />
    </Button>
  );
};
