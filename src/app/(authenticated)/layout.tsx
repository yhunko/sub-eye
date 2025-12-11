import { getQueryClient } from "@/shared/lib/react-query";
import { auth } from "@clerk/nextjs/server";
import { userQueryKeys } from "@/entities/user";
import { dehydrate } from "@tanstack/query-core";
import { HydrationBoundary } from "@tanstack/react-query";
import { PropsWithChildren } from "react";

export default async function AuthenticatedLayout({
  children,
}: Readonly<PropsWithChildren>) {
  const queryClient = getQueryClient();
  const { sessionClaims } = await auth();

  queryClient.setQueryData(
    userQueryKeys.publicMetadata.queryKey,
    sessionClaims?.publicMetadata,
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {children}
    </HydrationBoundary>
  );
}
