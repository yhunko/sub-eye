import { FC, PropsWithChildren } from "react";
import { Button } from "../../shared/components";
import { ChevronLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MobileBottomNav } from "../mobile-bottom-nav";

type SettingsLayoutProps = {
  title?: string;
  backTo?: string;
};

export const SettingsLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  title = " ",
  backTo,
  children,
}) => {
  return (
    <div className="container flex flex-col gap-2">
      <div className="relative flex h-14 flex-row items-center justify-center">
        {backTo && (
          <Button
            variant="ghost"
            className="absolute left-0 rounded-full bg-gray-500/10 backdrop-blur-md"
            size="icon-lg"
          >
            <Link to={backTo}>
              <ChevronLeft />
            </Link>
          </Button>
        )}

        <h1 className="text-2xl">{title}</h1>
      </div>

      <div className="flex w-full flex-col gap-2">{children}</div>

      <MobileBottomNav />
    </div>
  );
};
