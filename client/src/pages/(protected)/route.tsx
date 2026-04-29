import NiceModal from "@ebay/nice-modal-react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LocalizedDateFnsProvider } from "../../app/providers/localized-date-fns-provider";
import { planUsageQuery } from "../../entities/billing";
import { subscriptionsQuery } from "../../entities/subscription";
import { RootErrorFallback } from "../../shared/ui";

export const Route = createFileRoute("/(protected)")({
  beforeLoad: ({ context, location }) => {
    const userId = context.auth.userId;

    if (context.auth.isLoaded && !userId) {
      throw redirect({
        to: "/auth/sign-in/$",
        search: {
          redirect_url: location.href,
        },
      });
    }

    if (!userId) return;

    void context.queryClient.prefetchQuery(
      planUsageQuery({ params: { userId } }),
    );
    void context.queryClient.prefetchQuery(
      subscriptionsQuery({
        params: { userId, orgId: context.auth.orgId ?? null },
      }),
    );
  },
  errorComponent: RootErrorFallback,
  component: () => (
    <LocalizedDateFnsProvider>
      <NiceModal.Provider>
        <Outlet />
      </NiceModal.Provider>
    </LocalizedDateFnsProvider>
  ),
});
