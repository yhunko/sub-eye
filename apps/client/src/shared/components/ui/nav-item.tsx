import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { FC } from "react";
import { cn } from "@/shared/lib/classes-utils";
import {
  NavigationMenuItem,
  NavigationMenuLink,
  navigationMenuTriggerStyle,
} from "./navigation-menu";

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
}

export const NavItem: FC<NavItemProps> = ({
  to,
  icon: Icon,
  label,
  isActive,
}) => (
  <NavigationMenuItem>
    <NavigationMenuLink asChild className="flex-row items-center gap-2">
      <Link
        to={to}
        className={cn(
          navigationMenuTriggerStyle(),
          "flex items-center gap-2 transition-colors",
          isActive
            ? "bg-accent text-accent-foreground pointer-events-none"
            : "text-muted-foreground hover:text-foreground cursor-pointer bg-transparent",
        )}
      >
        <Icon className="size-4" />
        {label}
      </Link>
    </NavigationMenuLink>
  </NavigationMenuItem>
);
