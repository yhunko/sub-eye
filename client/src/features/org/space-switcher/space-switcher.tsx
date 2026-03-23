import { FC } from "react";
import { Link } from "@tanstack/react-router";
import { useActiveSpace } from "@/shared/lib/org/use-active-space";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components";
import { Check, ChevronDown, User, Users, Plus } from "lucide-react";
import * as m from "@/i18n/messages";

export const SpaceSwitcher: FC = () => {
  const {
    space,
    isPersonal,
    organization,
    switchToPersonal,
    switchToOrg,
    userMemberships,
    isLoaded,
  } = useActiveSpace();

  const currentLabel = isPersonal
    ? m.family_space_personal()
    : (organization?.name ?? space);

  const hasOrganizations =
    userMemberships?.data && userMemberships.data.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="hover:bg-accent flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-sm outline-none">
        {isPersonal ? (
          <User className="size-4 shrink-0" />
        ) : (
          <Users className="size-4 shrink-0" />
        )}
        <span className="max-w-28 truncate">{currentLabel}</span>
        <ChevronDown className="size-3 shrink-0 opacity-60" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem className="cursor-pointer" onClick={switchToPersonal}>
          <User className="mr-2 size-4" />
          <span className="flex-1 truncate">{m.family_space_personal()}</span>
          {isPersonal && <Check className="text-primary size-4" />}
        </DropdownMenuItem>

        {isLoaded &&
          userMemberships?.data &&
          userMemberships.data.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {userMemberships.data.map((membership) => {
                const isActive = space === membership.organization.id;
                return (
                  <DropdownMenuItem
                    key={membership.organization.id}
                    className="cursor-pointer"
                    onClick={() => switchToOrg(membership.organization.id)}
                  >
                    <Users className="mr-2 size-4" />
                    <span className="flex-1 truncate">
                      {membership.organization.name}
                    </span>
                    {isActive && <Check className="text-primary size-4" />}
                  </DropdownMenuItem>
                );
              })}
            </>
          )}

        {!hasOrganizations && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                to="/settings/group"
                className="flex cursor-pointer items-center"
              >
                <Plus className="mr-2 size-4" />
                <span className="flex-1 truncate">
                  {m.family_space_createGroup()}
                </span>
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
