import { getQueryClient } from "@/shared/lib/react-query";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { PropsWithChildren } from "react";

export default async function AuthenticatedLayout({
  children,
}: Readonly<PropsWithChildren>) {
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
