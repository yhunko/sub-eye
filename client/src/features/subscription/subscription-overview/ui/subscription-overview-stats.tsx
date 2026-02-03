import { Card, CardContent } from "@/shared/components/ui/card";
import { Spinner } from "@/shared/components/ui/spinner";
import { FC, ReactNode } from "react";
import { CurrencyBadge } from "@/entities/currency";
import * as m from "@/i18n/messages";
import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { subscriptionQuery } from "@/entities/subscription/api/subscription-query";

type SubscriptionOverviewStatsProps = {
  subscriptionId: string;
};

export const SubscriptionOverviewStats: FC<SubscriptionOverviewStatsProps> = ({
  subscriptionId,
}) => {
  const { userId } = useAuth();
  const { data: subscription, isLoading } = useQuery(
    subscriptionQuery({
      params: { id: subscriptionId, userId: userId ?? "" },
      options: { enabled: !!userId },
    }),
  );

  return (
    <Card className="py-0">
      <CardContent className="p-0">
        <div className="divide-border grid grid-cols-2 divide-x">
          <StatContainer label={m.common_perMonth()} loading={isLoading}>
            {subscription && (
              <CurrencyBadge
                currencyCode={subscription.billing.preferred.currencyCode}
                amount={subscription.billing.preferred.monthly}
              />
            )}
          </StatContainer>
          <StatContainer label={m.common_perYear()} loading={isLoading}>
            {subscription && (
              <CurrencyBadge
                currencyCode={subscription.billing.preferred.currencyCode}
                amount={subscription.billing.preferred.yearly}
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

      <div className="text-muted-foreground text-sm font-medium">{label}</div>
    </div>
  );
}
