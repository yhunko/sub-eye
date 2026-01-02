"use client";

import { useUser, SignOutButton } from "@clerk/nextjs";
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
import { LogOut, Cog } from "lucide-react";
import Link from "next/link";
import { UserAvatar } from "./user-avatar";

export const UserDropdownMenu = () => {
  const { user } = useUser();

  const fullName = user?.fullName ?? user?.username ?? "User";
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer outline-none">
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="leading-tight font-medium">{fullName}</span>
          {email && (
            <span className="text-muted-foreground truncate text-xs">
              {email}
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="cursor-pointer" asChild>
          <Item size="sm" asChild>
            <Link href="/settings">
              <ItemMedia>
                <Cog />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Settings</ItemTitle>
              </ItemContent>
            </Link>
          </Item>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem className="cursor-pointer" asChild>
          <SignOutButton signOutOptions={{ redirectUrl: "/auth/sign-in" }}>
            <Item size="sm">
              <ItemMedia>
                <LogOut />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>Sign out</ItemTitle>
              </ItemContent>
            </Item>
          </SignOutButton>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
