import { PropsWithChildren } from "react";
import { ClerkLoaded, ClerkLoading } from "@clerk/nextjs";
import Image from "next/image";

export default async function ProtectedClerkPages({
  children,
}: Readonly<PropsWithChildren>) {
  return (
    <>
      <ClerkLoading>
        <div className="flex h-svh items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Image
              src="/assets/logo.svg"
              className="animate-bounce"
              alt="Logo"
              width={128}
              height={128}
            />
            <p className="text-xl">Loading...</p>
          </div>
        </div>
      </ClerkLoading>
      <ClerkLoaded>{children}</ClerkLoaded>
    </>
  );
}
