import { FC, PropsWithChildren } from "react";
import { DesktopNavbar } from "@/widgets/dashboard-layout/navbar/desktop-navbar";
import { cn } from "@/shared/lib/classes-utils";

const mainBaseClassName =
  "mx-auto flex min-h-0 w-full max-w-5xl flex-1 px-0 pt-1 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:px-6 md:pt-6 md:pb-8";

const cardSurfaceClassName =
  "bg-card relative mx-2 mt-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-4xl border shadow-lg md:mx-auto md:mt-0 md:w-full md:max-w-2xl md:rounded-[1.75rem]";

const plainSurfaceClassName =
  "relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col";

type SubscriptionNativeLayoutProps = {
  className?: string;
  contentClassName?: string;
  surface?: "card" | "plain";
  mainClassName?: string;
};

export const SubscriptionNativeLayout: FC<
  PropsWithChildren<SubscriptionNativeLayoutProps>
> = ({
  children,
  className,
  contentClassName,
  surface = "card",
  mainClassName,
}) => {
  return (
    <div
      className={cn(
        "bg-background flex min-h-svh flex-col overflow-x-clip md:overflow-visible",
        className,
      )}
    >
      <DesktopNavbar />

      <main className={cn(mainBaseClassName, mainClassName)}>
        {surface === "card" ? (
          <section className={cn(cardSurfaceClassName, contentClassName)}>
            {children}
          </section>
        ) : (
          <section className={cn(plainSurfaceClassName, contentClassName)}>
            {children}
          </section>
        )}
      </main>
    </div>
  );
};
