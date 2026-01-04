import { Card, CardContent, Spinner } from "@/shared/components";
import { useSubscription } from "@/entities/subscription";
import { FC, ReactNode } from "react";
import { PeriodBadge } from "../period-badge";
import { CurrencyBadge } from "../../../currency";

type SubscriptionOverviewStatsProps = {
  subscriptionId: string;
};

export const SubscriptionOverviewStats: FC<SubscriptionOverviewStatsProps> = ({
  subscriptionId,
}) => {
  const { data: subscription, isLoading } = useSubscription({
    params: { id: subscriptionId },
  });

  return (
    <Card className="py-0">
      <CardContent className="p-0">
        <div className="divide-border grid grid-cols-3 divide-x">
          <StatContainer label="Cycle" loading={isLoading}>
            {subscription && (
              <PeriodBadge
                every={subscription!.every}
                period={subscription!.period}
              />
            )}
          </StatContainer>
          <StatContainer label="Monthly" loading={isLoading}>
            {subscription && (
              <CurrencyBadge
                currencyCode={subscription!.billing.preferred.currencyCode}
                amount={subscription!.billing.preferred.monthly}
              />
            )}
          </StatContainer>
          <StatContainer label="Yearly" loading={isLoading}>
            {subscription && (
              <CurrencyBadge
                currencyCode={subscription!.billing.preferred.currencyCode}
                amount={subscription!.billing.preferred.yearly}
              />
            )}
          </StatContainer>
        </div>
      </CardContent>
    </Card>
  );
};

type StatContainerProps = {
  label: string;
  loading?: boolean;
  children: ReactNode;
};
function StatContainer({ children, loading, label }: StatContainerProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-2 p-4 text-center md:p-6">
      {loading ? <Spinner /> : children}

      <div className="text-muted-foreground text-base">{label}</div>
    </div>
  );
}
