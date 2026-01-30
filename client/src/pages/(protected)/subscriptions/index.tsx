import { createFileRoute } from "@tanstack/react-router";
import { useSubscriptions } from "../../../entities/subscription";
import { useAuth } from "@clerk/clerk-react";

export const Route = createFileRoute("/(protected)/subscriptions/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { userId } = useAuth();
  const { data: subscriptions } = useSubscriptions({
    params: {
      userId: userId!,
    },
    options: {
      enabled: !!userId,
    },
  });

  console.log(subscriptions);

  return <div>Hello "/(protected)/subscriptions/"!</div>;
}
