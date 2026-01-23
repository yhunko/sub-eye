import { PropsWithChildren } from "react";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ProtectedClerkPages({
  children,
}: Readonly<PropsWithChildren>) {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    redirect("/auth/sign-in");
  }

  return <>{children}</>;
}
