import { FC, PropsWithChildren } from "react";
import { DesktopNavbar } from "@/widgets/dashboard-layout/navbar/desktop-navbar";
import { cn } from "@/shared/lib/classes-utils";

type SubscriptionNativeLayoutProps = {
  className?: string;
  contentClassName?: string;
};

export const SubscriptionNativeLayout: FC<
  PropsWithChildren<SubscriptionNativeLayoutProps>
> = ({ children, className, contentClassName }) => {
  return (
    <div
      className={cn(
        "bg-background flex min-h-svh flex-col overflow-x-clip md:overflow-visible",
        className,
      )}
    >
      <DesktopNavbar />

      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+1rem)] md:px-6 md:pt-6 md:pb-8">
        <section
          className={cn(
            "bg-card relative mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-hidden rounded-lg border shadow-sm",
            contentClassName,
          )}
        >
          {children}
        </section>
      </main>
    </div>
  );
};
