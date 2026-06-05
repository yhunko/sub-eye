import { Item } from "@/shared/components/ui/item";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { TelegramNotificationsCardShell } from "./telegram-notifications-card-shell";

export const TelegramLoadingCard = () => {
  return (
    <TelegramNotificationsCardShell>
      <Item
        variant="outline"
        className="bg-muted/20 items-center justify-between gap-3"
      >
        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="size-10 rounded-2xl" />

          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </Item>
    </TelegramNotificationsCardShell>
  );
};
