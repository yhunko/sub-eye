import { FC, PropsWithChildren } from "react";
import { Button } from "../../shared/components";
import { ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useBreakpoint } from "@/shared/hooks/use-breakpoint";
import MobileBottomNav from "../mobile-bottom-nav";
import { DesktopNavbar } from "../dashboard-layout/navbar/desktop-navbar";

type SettingsLayoutProps = {
  title?: string;
  backTo?: string;
  backToSearch?: Record<string, unknown>;
};

export const SettingsLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  title = " ",
  backTo,
  backToSearch,
  children,
}) => {
  const isDesktop = useBreakpoint("md");

  return (
    <div className="flex min-h-svh w-full flex-col gap-2">
      {isDesktop && <DesktopNavbar />}

      <div className="container mx-auto flex w-full max-w-xl grow flex-col gap-2">
        <div className="relative flex h-14 flex-row items-center justify-center">
          {backTo && (
            <Button
              variant="ghost"
              className="absolute left-0 rounded-full bg-gray-500/10 backdrop-blur-md"
              size="icon-lg"
              asChild
            >
              <Link to={backTo} search={backToSearch}>
                <ChevronLeft />
              </Link>
            </Button>
          )}

          <h1 className="text-2xl">{title}</h1>
        </div>

        <div className="flex w-full grow flex-col gap-2">
          {children}

          <div className="mt-2 self-center text-sm">
            v{import.meta.env.APP_VERSION}
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
};
