import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { LocalizedDateFnsProvider } from "../../app/providers/localized-date-fns-provider";

export const Route = createFileRoute("/(protected)")({
  beforeLoad: ({ context, location }) => {
    if (context.auth.isLoaded && !context.auth.userId) {
      throw redirect({
        to: "/auth/sign-in/$",
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: () => (
    <>
      <Outlet />

      <LocalizedDateFnsProvider />
    </>
  ),
});
