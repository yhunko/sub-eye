import { FC } from "react";
import * as m from "@/i18n/messages";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { RefreshCw } from "lucide-react";

export const SubscriptionHistoryInsightsLoadingState: FC = () => (
  <Card className="overflow-hidden py-0">
    <CardHeader className="border-b pt-4 pb-4 md:pt-5">
      <CardTitle>{m.subscription_history_insights_title()}</CardTitle>
      <CardDescription>{m.subscription_history_loading()}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3 pt-4">
      <div className="grid gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="rounded-xl border p-4">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="mt-3 h-6 w-4/5" />
            <Skeleton className="mt-2 h-3 w-3/5" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-40" />
    </CardContent>
  </Card>
);

type SubscriptionHistoryInsightsErrorStateProps = {
  isFetching: boolean;
  onRetry: () => void;
};

export const SubscriptionHistoryInsightsErrorState: FC<
  SubscriptionHistoryInsightsErrorStateProps
> = ({ isFetching, onRetry }) => (
  <Card className="py-0">
    <CardHeader className="pt-4 md:pt-5">
      <CardTitle>{m.subscription_history_insights_title()}</CardTitle>
      <CardDescription>{m.subscription_history_error()}</CardDescription>
    </CardHeader>
    <CardContent className="pt-0">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={onRetry}
        disabled={isFetching}
      >
        <RefreshCw
          className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
        />
        {m.subscription_history_retry()}
      </Button>
    </CardContent>
  </Card>
);
