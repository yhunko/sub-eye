import { FC, PropsWithChildren, Suspense, lazy } from "react";
import { Button } from "../../shared/components";
import { ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";

const MobileBottomNav = lazy(() =>
  import("../mobile-bottom-nav").then((module) => ({
    default: module.MobileBottomNav,
  })),
);
const DesktopNavbar = lazy(() =>
  import("../dashboard-layout/navbar/desktop-navbar").then((module) => ({
    default: module.DesktopNavbar,
  })),
);

type SettingsLayoutProps = {
  title?: string;
  backTo?: string;
};

export const SettingsLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  title = " ",
  backTo,
  children,
}) => {
  const isDesktop = useBreakpoint("md");

  return (
    <div className="flex min-h-svh w-full flex-col gap-2">
      {isDesktop && (
        <Suspense fallback={<div className="h-14 w-full" />}>
          <DesktopNavbar />
        </Suspense>
      )}

      <div className="container mx-auto flex w-full max-w-xl grow flex-col gap-2">
        <div className="relative flex h-14 flex-row items-center justify-center">
          {backTo && (
            <Button
              variant="ghost"
              className="absolute left-0 rounded-full bg-gray-500/10 backdrop-blur-md"
              size="icon-lg"
              asChild
            >
              <Link to={backTo}>
                <ChevronLeft />
              </Link>
            </Button>
          )}

          <h1 className="text-2xl">{title}</h1>
        </div>

        <div className="flex w-full grow flex-col gap-2">{children}</div>
      </div>

      <MobileBottomNav />
    </div>
  );
};
