import { DashboardLogo } from "./dashboard-logo";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components";
import * as React from "react";
import Link from "next/link";
import { UserDropdownMenu } from "../../auth/ui/user-dropdown-menu";

export const DashboardNavbar = () => {
  return (
    <header className="bg-background/60 supports-backdrop-filter:bg-background/60 sticky top-0 z-40 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-3 px-4 md:gap-6 md:px-6">
        <DashboardLogo />

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Button asChild variant="outline" size="icon">
            <Link href="/subscriptions/add">
              <Plus className="size-5 transition-all" />
              <span className="sr-only">Add subscription</span>
            </Link>
          </Button>

          <UserDropdownMenu />
        </div>
      </div>
    </header>
  );
};
