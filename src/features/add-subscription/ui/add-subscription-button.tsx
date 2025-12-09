import { Button } from "@/shared/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export const AddSubscriptionButton = () => {
  return (
    <Link href="/subscriptions/add">
      <Button
        asChild
        size="icon"
        className="fixed right-5 bottom-5 z-50 rounded-full"
      >
        <Plus className="size-12 p-2" />
      </Button>
    </Link>
  );
};
