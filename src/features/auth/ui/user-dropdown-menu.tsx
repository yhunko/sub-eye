"use client";

import { SignedIn, useUser, SignOutButton } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Item,
  ItemTitle,
  ItemContent,
  ItemMedia,
  DropdownMenuLabel,
} from "@/shared/components";
import { LogOut, Cog } from "lucide-react";
import Link from "next/link";

export const UserDropdownMenu = () => {
  const { user } = useUser();

  const fullName = user?.fullName ?? user?.username ?? "User";
  const email = user?.primaryEmailAddress?.emailAddress;
  const imageUrl = user?.imageUrl ?? undefined;
  const initials = (fullName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <SignedIn>
      <DropdownMenu>
        <DropdownMenuTrigger className="cursor-pointer outline-none">
          <Avatar className="size-8">
            <AvatarImage src={imageUrl} alt={fullName} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
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
    </SignedIn>
  );
};
