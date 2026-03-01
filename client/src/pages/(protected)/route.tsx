import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LocalizedDateFnsProvider } from "../../app/providers/localized-date-fns-provider";
import { planUsageQuery } from "../../entities/billing";
import NiceModal from "@ebay/nice-modal-react";

export const Route = createFileRoute("/(protected)")({
  beforeLoad: async ({ context, location }) => {
    const userId = context.auth.userId;

    if (context.auth.isLoaded && !userId) {
      throw redirect({
        to: "/auth/sign-in/$",
        search: {
          redirect_url: location.href,
        },
      });
    }

    await context.queryClient.prefetchQuery(
      planUsageQuery({ params: { userId: userId! } }),
    );
  },
  component: () => (
    <LocalizedDateFnsProvider>
      <NiceModal.Provider>
        <Outlet />
      </NiceModal.Provider>
    </LocalizedDateFnsProvider>
  ),
});
