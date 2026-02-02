import {
  Item,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
} from "@/shared/components";
import { FC } from "react";
import { useUser } from "@clerk/clerk-react";
import { UserAvatar } from "../../auth";
import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const UserProfileCard: FC = () => {
  const { user } = useUser();

  const fullName = user?.fullName ?? user?.username;
  const email = user?.primaryEmailAddress?.emailAddress;

  return (
    <Item variant="outline" size="sm" asChild>
      <Link to="/settings/account">
        <ItemMedia>
          <UserAvatar className="size-16!" />
        </ItemMedia>
        <ItemContent>
          <ItemTitle>{fullName}</ItemTitle>
          <ItemDescription className="max-w-50 text-ellipsis">
            {email}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          <ChevronRight className="size-4" />
        </ItemActions>
      </Link>
    </Item>
  );
};
