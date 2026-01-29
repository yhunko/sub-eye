"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Item,
  ItemTitle,
  ItemContent,
  ItemMedia,
  DropdownMenuLabel,
} from "@/shared/components";
import { LogOut } from "lucide-react";
import { UserAvatar } from "./user-avatar";
import { FC } from "react";
import { SignOutButton, useUser } from "@clerk/clerk-react";

type UserDropdownMenuProps = {
  triggerId: string;
};

export const UserDropdownMenu: FC<UserDropdownMenuProps> = ({ triggerId }) => {
  const { user } = useUser();
  // const { t } = useTranslation("auth");

  const fullName = user?.fullName ?? user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        id={triggerId}
        className="cursor-pointer outline-none"
      >
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <UserAvatar />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{fullName}</span>
              {email && (
                <span className="text-muted-foreground truncate text-xs">
                  {email}
                </span>
              )}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/*<DropdownMenuItem className="cursor-pointer" asChild>*/}
        {/*  <Item size="sm" asChild>*/}
        {/*    <Link href="/settings/account/billing">*/}
        {/*      <ItemMedia>*/}
        {/*        <Sparkles />*/}
        {/*      </ItemMedia>*/}
        {/*      <ItemContent>*/}
        {/*        <ItemTitle>Support development</ItemTitle>*/}
        {/*      </ItemContent>*/}
        {/*    </Link>*/}
        {/*  </Item>*/}
        {/*</DropdownMenuItem>*/}

        {/*<DropdownMenuSeparator />*/}

        {/*<DropdownMenuItem className="cursor-pointer" asChild>*/}
        {/*  <Item size="sm" asChild>*/}
        {/*    <Link to="/settings">*/}
        {/*      <ItemMedia>*/}
        {/*        <Cog />*/}
        {/*      </ItemMedia>*/}
        {/*      <ItemContent>*/}
        {/*        <ItemTitle>{t("user.menu.settings")}</ItemTitle>*/}
        {/*      </ItemContent>*/}
        {/*    </Link>*/}
        {/*  </Item>*/}
        {/*</DropdownMenuItem>*/}

        {/*<DropdownMenuSeparator />*/}

        <DropdownMenuItem className="cursor-pointer" asChild>
          <SignOutButton signOutOptions={{ redirectUrl: "/auth/sign-in" }}>
            <Item size="sm">
              <ItemMedia>
                <LogOut />
              </ItemMedia>
              <ItemContent>
                {/*<ItemTitle>{t("user.menu.signOut")}</ItemTitle>*/}
                <ItemTitle>Sign out</ItemTitle>
              </ItemContent>
            </Item>
          </SignOutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
