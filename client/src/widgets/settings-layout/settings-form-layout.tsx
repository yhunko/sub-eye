import { FC, PropsWithChildren, ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/shared/components";
import { cn } from "@/shared/lib/classes-utils";
import { Link } from "@tanstack/react-router";
import * as m from "@/i18n/messages";

export type SettingsLayoutProps = {
  Breadcrumbs: ReactNode;
  className?: string;
};

export const SettingsFormLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  Breadcrumbs,
  className,
  children,
}) => {
  return (
    <div className="flex h-full w-full justify-center">
      <div className={cn("w-full max-w-xl space-y-4", className)}>
        <Breadcrumb className="mx-1">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/settings">{m.user_menu_settings()}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>

            {Breadcrumbs}
          </BreadcrumbList>
        </Breadcrumb>

        {children}
      </div>
    </div>
  );
};
