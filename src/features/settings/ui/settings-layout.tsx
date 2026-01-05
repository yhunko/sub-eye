import { FC, PropsWithChildren, ReactNode } from "react";
import { cn } from "@/shared/lib";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
} from "@/shared/components";
import { useTranslations } from "next-intl";

export type SettingsLayoutProps = {
  Breadcrumbs: ReactNode;
  className?: string;
};

export const SettingsLayout: FC<PropsWithChildren<SettingsLayoutProps>> = ({
  Breadcrumbs,
  className,
  children,
}) => {
  const t = useTranslations("settings");

  return (
    <div className="flex h-full w-full justify-center">
      <div className={cn("w-full max-w-xl space-y-4", className)}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/settings">{t("title")}</BreadcrumbLink>
            </BreadcrumbItem>

            {Breadcrumbs}
          </BreadcrumbList>
        </Breadcrumb>

        {children}
      </div>
    </div>
  );
};
