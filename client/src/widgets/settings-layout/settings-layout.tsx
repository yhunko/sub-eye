import { FC, PropsWithChildren, ReactNode } from "react";
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
  rightAction?: ReactNode;
  showVersion?: boolean;
};

export const SettingsLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  title = " ",
  backTo,
  backToSearch,
  rightAction,
  showVersion = false,
  children,
}) => {
  const isDesktop = useBreakpoint("md");

  return (
    <div className="flex min-h-svh w-full flex-col">
      {isDesktop && <DesktopNavbar />}

      {/* px-4: reasonable horizontal margin on mobile. */}
      {/* md: centered column, max-w-xl, no extra padding. */}
      {/* pb-28: clears mobile bottom navbar. md:pb-4: desktop bottom spacing. */}
      <div className="flex w-full grow flex-col gap-2 px-4 pb-28 md:container md:mx-auto md:max-w-xl md:px-0 md:pt-2 md:pb-4">
        <div className="grid h-14 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-2">
          {backTo ? (
            <Button
              variant="ghost"
              className="rounded-full bg-gray-500/10 backdrop-blur-md"
              size="icon-lg"
              asChild
            >
              <Link to={backTo} search={backToSearch}>
                <ChevronLeft />
              </Link>
            </Button>
          ) : (
            <span />
          )}

          <h1 className="truncate text-center text-2xl">{title}</h1>

          <div className="justify-self-end">
            {rightAction ?? <span className="block size-11" />}
          </div>
        </div>

        <div className="flex w-full grow flex-col gap-2">
          {children}

          {showVersion && (
            <div className="text-muted-foreground mt-auto pt-4 pb-2 text-center text-sm">
              v{import.meta.env.APP_VERSION}
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
};
